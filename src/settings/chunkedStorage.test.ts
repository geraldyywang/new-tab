import {beforeEach, describe, expect, it} from 'vitest';
import {
  installChromeStorageMock,
  type ChromeStorageMock,
} from '../test/chromeStorageMock';
import {
  chunkKey,
  isChunkedKey,
  joinChunks,
  MAX_CHUNKS,
  parseManifest,
  readChunked,
  removeChunked,
  splitIntoChunks,
  writeChunked,
} from './chunkedStorage';
import {itemBytes} from './quota';
import {chromeBackend, type StorageBackend} from './storageBackends';

function bigList(count: number, text = 'x') {
  return Array.from({length: count}, (_, i) => ({
    id: `id-${i}`,
    label: text.repeat(100),
  }));
}

describe('splitIntoChunks / joinChunks', () => {
  it('keeps a small value in one chunk', () => {
    expect(splitIntoChunks('k', '{"a":1}')).toEqual(['{"a":1}']);
  });

  it('splits so every item fits and joins back losslessly', () => {
    const text = JSON.stringify(bigList(200));
    const chunks = splitIntoChunks('themes', text, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((piece, i) =>
      expect(itemBytes(chunkKey('themes', i), piece)).toBeLessThanOrEqual(1000),
    );
    expect(chunks.join('')).toBe(text);

    const items = Object.fromEntries(
      chunks.map((piece, i) => [chunkKey('themes', i), piece]),
    );
    expect(joinChunks('themes', {chunks: chunks.length}, items)).toEqual(
      bigList(200),
    );
  });

  it('counts escapes and multi-byte characters, never splitting pairs', () => {
    const text = JSON.stringify(bigList(20, '"é😀\n'));
    const chunks = splitIntoChunks('k', text, 300);
    chunks.forEach((piece, i) => {
      expect(itemBytes(chunkKey('k', i), piece)).toBeLessThanOrEqual(300);
      expect(piece).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/);
    });
    expect(chunks.join('')).toBe(text);
  });

  it('treats a missing or non-string chunk as missing', () => {
    expect(joinChunks('k', {chunks: 2}, {'k:0': '[1,'})).toBeUndefined();
    expect(
      joinChunks('k', {chunks: 2}, {'k:0': '[1,', 'k:1': 2}),
    ).toBeUndefined();
  });

  it('treats chunks that do not join into JSON as missing', () => {
    expect(
      joinChunks('k', {chunks: 2}, {'k:0': '[1,', 'k:1': '2'}),
    ).toBeUndefined();
  });
});

describe('parseManifest', () => {
  it.each([null, 'x', {}, {chunks: 0}, {chunks: 1.5}, {chunks: '2'}])(
    'rejects %j',
    value => expect(parseManifest(value)).toBeNull(),
  );

  it('rejects more than MAX_CHUNKS', () => {
    expect(parseManifest({chunks: MAX_CHUNKS + 1})).toBeNull();
    expect(parseManifest({chunks: 3})).toEqual({chunks: 3});
  });
});

describe('isChunkedKey', () => {
  it('matches the base key and its chunks only', () => {
    expect(isChunkedKey('a', 'a')).toBe(true);
    expect(isChunkedKey('a', 'a:3')).toBe(true);
    expect(isChunkedKey('a', 'ab')).toBe(false);
  });
});

describe('read/write/remove with chrome.storage.sync', () => {
  let mock: ChromeStorageMock;
  let backend: StorageBackend;

  beforeEach(() => {
    mock = installChromeStorageMock();
    backend = chromeBackend('sync');
  });

  it('round-trips a value larger than one sync item', async () => {
    const value = bigList(150);
    expect(JSON.stringify(value).length).toBeGreaterThan(8192);
    await writeChunked(backend, 'big', value);

    const manifest = parseManifest(mock.data.get('big'));
    expect(manifest?.chunks).toBeGreaterThan(1);
    expect(await readChunked(backend, 'big')).toEqual(value);
  });

  it('removes stale chunks when the value shrinks', async () => {
    await writeChunked(backend, 'big', bigList(150));
    const before = parseManifest(mock.data.get('big'))?.chunks ?? 0;

    await writeChunked(backend, 'big', bigList(1));
    expect(mock.data.get('big')).toEqual({chunks: 1});
    for (let i = 1; i < before; i++) {
      expect(mock.data.has(chunkKey('big', i))).toBe(false);
    }
    expect(await readChunked(backend, 'big')).toEqual(bigList(1));
  });

  it('adds chunks when the value grows', async () => {
    await writeChunked(backend, 'big', bigList(1));
    await writeChunked(backend, 'big', bigList(150));
    expect(await readChunked(backend, 'big')).toEqual(bigList(150));
  });

  it('writes chunks before the manifest', async () => {
    const order: string[][] = [];
    const set = backend.set.bind(backend);
    const spied: StorageBackend = {
      ...backend,
      set: items => {
        order.push(Object.keys(items));
        return set(items);
      },
    };
    await writeChunked(spied, 'big', bigList(150));
    expect(order).toHaveLength(2);
    expect(order[0].every(key => key.startsWith('big:'))).toBe(true);
    expect(order[1]).toEqual(['big']);
  });

  it('reads a manifest pointing at missing chunks as missing', async () => {
    await writeChunked(backend, 'big', bigList(150));
    mock.data.delete(chunkKey('big', 1));
    expect(await readChunked(backend, 'big')).toBeUndefined();
  });

  it('reads a missing or corrupt manifest as missing', async () => {
    expect(await readChunked(backend, 'none')).toBeUndefined();
    mock.data.set('bad', {chunks: 'lots'});
    expect(await readChunked(backend, 'bad')).toBeUndefined();
  });

  it('removes the manifest and every chunk', async () => {
    await writeChunked(backend, 'big', bigList(150));
    mock.data.set('other', 1);
    await removeChunked(backend, 'big');
    expect([...mock.data.keys()]).toEqual(['other']);
  });
});
