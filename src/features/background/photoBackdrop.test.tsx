import {act, render, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {TEST_PALETTE} from '../../test/photoFixtures';
import {createBackgroundImageStore} from './backgroundImage';
import {setDisplayPreview} from './displayPreview';
import type {StoredImage} from './imageStore';
import {PhotoBackdropSync, useCurrentPhotoBackdrop} from './photoBackdrop';
import {
  readPhotoCache,
  usePhotoBackdrop,
  writePhotoCache,
} from '../../theme/photoBackdrop';
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

describe('useCurrentPhotoBackdrop', () => {
  it('gives the palette with the dim, previewed or saved, and caches it', async () => {
    const store = storeWith(IMAGE);
    const {result} = renderHook(() => useCurrentPhotoBackdrop(store));
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
    const {result} = renderHook(() => useCurrentPhotoBackdrop(store));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.backdrop).toBeNull();
    expect(readPhotoCache()).toBeNull();
  });
});

describe('PhotoBackdropSync', () => {
  it('publishes the backdrop for theming', async () => {
    render(<PhotoBackdropSync store={storeWith(IMAGE)} />);
    const {result} = renderHook(() => usePhotoBackdrop());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.backdrop?.palette).toEqual(TEST_PALETTE);
  });
});
