import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {TEST_PALETTE} from '../../test/photoFixtures';
import {createBackgroundImageStore} from './backgroundImage';
import {setDisplayPreview} from './displayPreview';
import type {StoredImage} from './imageStore';
import {
  PHOTO_CACHE_KEY,
  readPhotoCache,
  usePhotoBackdrop,
  writePhotoCache,
} from './photoBackdrop';
import {DEFAULT_BACKGROUND_DISPLAY} from './settings';

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: () => 'blob:photo',
    revokeObjectURL: () => {},
  });
});

afterEach(() => {
  setDisplayPreview(null);
  window.localStorage.clear();
});

function storeWith(image: StoredImage | null) {
  return createBackgroundImageStore({
    get: () => Promise.resolve(image),
    put: () => Promise.resolve(),
    remove: () => Promise.resolve(),
  });
}

const IMAGE: StoredImage = {
  blob: new Blob(['webp'], {type: 'image/webp'}),
  width: 100,
  height: 50,
  type: 'image/webp',
  byteSize: 4,
  updatedAt: 1,
  palette: TEST_PALETTE,
};

describe('photo cache', () => {
  it('round-trips a backdrop and forgets it when cleared', () => {
    writePhotoCache({palette: TEST_PALETTE, dim: 0.3});
    expect(readPhotoCache()).toEqual({
      palette: TEST_PALETTE,
      dim: 0.3,
      paneOpacity: null,
    });
    writePhotoCache({palette: TEST_PALETTE, dim: 0, paneOpacity: 0.4});
    expect(readPhotoCache()?.paneOpacity).toBe(0.4);
    writePhotoCache(null);
    expect(readPhotoCache()).toBeNull();
  });

  it.each([
    ['corrupt JSON', '{nope'],
    ['a bad palette', JSON.stringify({palette: {}, dim: 0})],
    ['a dim out of range', JSON.stringify({palette: TEST_PALETTE, dim: 2})],
    [
      'a pane opacity out of range',
      JSON.stringify({palette: TEST_PALETTE, dim: 0, paneOpacity: -1}),
    ],
  ])('ignores %s', (_, raw) => {
    window.localStorage.setItem(PHOTO_CACHE_KEY, raw);
    expect(readPhotoCache()).toBeNull();
  });
});

describe('usePhotoBackdrop', () => {
  it('gives the palette with the dim, previewed or saved, and caches it', async () => {
    const store = storeWith(IMAGE);
    const {result} = renderHook(() => usePhotoBackdrop(store));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const savedDim = DEFAULT_BACKGROUND_DISPLAY.dim / 100;
    expect(result.current.backdrop).toEqual({
      palette: TEST_PALETTE,
      dim: savedDim,
      paneOpacity: null,
    });
    expect(readPhotoCache()?.dim).toBe(savedDim);

    act(() =>
      setDisplayPreview({
        ...DEFAULT_BACKGROUND_DISPLAY,
        dim: 60,
        paneOpacity: 30,
      }),
    );
    expect(result.current.backdrop?.dim).toBe(0.6);
    expect(result.current.backdrop?.paneOpacity).toBe(0.3);
    expect(readPhotoCache()?.paneOpacity).toBeNull();
    // Only saved options are cached
    expect(readPhotoCache()?.dim).toBe(savedDim);
  });

  it('has no backdrop, and clears the cache, without a photo', async () => {
    writePhotoCache({palette: TEST_PALETTE, dim: 0});
    const store = storeWith(null);
    const {result} = renderHook(() => usePhotoBackdrop(store));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.backdrop).toBeNull();
    expect(readPhotoCache()).toBeNull();
  });
});
