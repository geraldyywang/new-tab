import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  deleteImage,
  getImage,
  parseStoredImage,
  putImage,
  type StoredImage,
} from './imageStore';

function makeImage(text = 'webp-bytes'): StoredImage {
  const blob = new Blob([text], {type: 'image/webp'});
  return {
    blob,
    width: 3840,
    height: 2160,
    type: 'image/webp',
    byteSize: blob.size,
    updatedAt: 1_700_000_000_000,
  };
}

// jsdom's Blob can't be structured-cloned into IndexedDB; Node's can. Loaded
// by a non-literal specifier so the app's tsconfig needn't know Node types.
const NODE_BUFFER = 'node:buffer';
let nodeBlob: typeof Blob;

beforeAll(async () => {
  // node:buffer's Blob implements the same Web API as the DOM's
  const nodeBuffer = (await import(/* @vite-ignore */ NODE_BUFFER)) as {
    Blob: typeof Blob;
  };
  nodeBlob = nodeBuffer.Blob;
});

beforeEach(() => {
  vi.stubGlobal('Blob', nodeBlob);
  vi.stubGlobal('indexedDB', new IDBFactory());
});

describe('imageStore', () => {
  it('returns null when nothing is stored', async () => {
    expect(await getImage()).toBeNull();
  });

  it('stores and reads back the photo and its metadata', async () => {
    await putImage(makeImage());
    const image = await getImage();
    expect(image).toMatchObject({
      width: 3840,
      height: 2160,
      type: 'image/webp',
      byteSize: 10,
      updatedAt: 1_700_000_000_000,
    });
    expect(await image?.blob.text()).toBe('webp-bytes');
  });

  it('replaces the previous photo', async () => {
    await putImage(makeImage('first'));
    await putImage(makeImage('second'));
    expect(await (await getImage())?.blob.text()).toBe('second');
  });

  it('deletes the photo', async () => {
    await putImage(makeImage());
    await deleteImage();
    expect(await getImage()).toBeNull();
  });

  it('deleting when empty is fine', async () => {
    await expect(deleteImage()).resolves.toBeUndefined();
  });
});

describe('parseStoredImage', () => {
  it('accepts a complete record', () => {
    const image = makeImage();
    expect(parseStoredImage(image)).toEqual(image);
  });

  it.each([
    ['null', null],
    ['a string', 'photo'],
    ['no blob', {...makeImage(), blob: 'x'}],
    ['an empty blob', {...makeImage(), blob: new Blob([])}],
    ['zero width', {...makeImage(), width: 0}],
    ['a non-image type', {...makeImage(), type: 'text/plain'}],
    ['missing updatedAt', {...makeImage(), updatedAt: undefined}],
  ])('rejects %s', (_, data) => {
    expect(parseStoredImage(data)).toBeNull();
  });
});
