import {waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {createBackgroundImageStore, type ImageBackend} from './backgroundImage';
import type {StoredImage} from './imageStore';

let urlCount = 0;
const revoked: string[] = [];

beforeEach(() => {
  urlCount = 0;
  revoked.length = 0;
  // jsdom has no object URLs; each test file has its own environment
  Object.assign(URL, {
    createObjectURL: () => `blob:photo-${++urlCount}`,
    revokeObjectURL: (url: string) => revoked.push(url),
  });
});

function makeImage(): StoredImage {
  const blob = new Blob(['webp'], {type: 'image/webp'});
  return {
    blob,
    width: 100,
    height: 50,
    type: 'image/webp',
    byteSize: blob.size,
    updatedAt: 1,
  };
}

/** An in-memory backend; `get` can be made to fail. */
function memoryBackend(initial: StoredImage | null = null) {
  let stored = initial;
  const backend: ImageBackend & {failGet?: Error; failPut?: Error} = {
    get: () =>
      backend.failGet
        ? Promise.reject(backend.failGet)
        : Promise.resolve(stored),
    put: image => {
      if (backend.failPut) return Promise.reject(backend.failPut);
      stored = image;
      return Promise.resolve();
    },
    remove: () => {
      stored = null;
      return Promise.resolve();
    },
  };
  return backend;
}

describe('createBackgroundImageStore', () => {
  it('swaps and revokes object URLs on save and remove', async () => {
    const store = createBackgroundImageStore(memoryBackend());
    await store.save(makeImage());
    await store.save(makeImage());
    expect(store.getState().url).toBe('blob:photo-2');
    expect(revoked).toEqual(['blob:photo-1']);
    await store.remove();
    expect(store.getState().url).toBeNull();
    expect(revoked).toEqual(['blob:photo-1', 'blob:photo-2']);
  });

  it('reports a full disk as a quota error and keeps the old photo', async () => {
    const backend = memoryBackend(makeImage());
    const store = createBackgroundImageStore(backend);
    store.load();
    await waitFor(() => expect(store.getState().url).toBe('blob:photo-1'));
    backend.failPut = new DOMException('full', 'QuotaExceededError');
    await expect(store.save(makeImage())).rejects.toMatchObject({
      code: 'quota',
    });
    expect(store.getState().url).toBe('blob:photo-1');
  });

  it('ignores a read that finishes after a newer write', async () => {
    const backend = memoryBackend(makeImage());
    const reads: Array<(image: StoredImage | null) => void> = [];
    backend.get = () => new Promise(resolve => reads.push(resolve));
    const store = createBackgroundImageStore(backend);
    store.load();
    await store.remove();
    reads[0]?.(makeImage());
    await Promise.resolve();
    expect(store.getState()).toEqual({loaded: true, url: null, meta: null});
  });

  it('re-reads when another tab changes the photo', async () => {
    const channel = new EventTarget();
    const backend = memoryBackend();
    // Only addEventListener/postMessage are used
    const store = createBackgroundImageStore(
      backend,
      channel as BroadcastChannel,
    );
    store.load();
    await waitFor(() => expect(store.getState().loaded).toBe(true));
    await backend.put(makeImage());
    channel.dispatchEvent(new Event('message'));
    await waitFor(() => expect(store.getState().url).toBe('blob:photo-1'));
    expect(store.getState().meta).toMatchObject({width: 100, height: 50});
  });
});
