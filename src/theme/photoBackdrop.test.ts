import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {TEST_PALETTE} from '../test/photoFixtures';
import {
  PHOTO_CACHE_KEY,
  publishPhotoBackdrop,
  readPhotoCache,
  usePhotoBackdrop,
  writePhotoCache,
} from './photoBackdrop';

afterEach(() => {
  window.localStorage.clear();
});

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
  it('follows what is published', () => {
    const {result} = renderHook(() => usePhotoBackdrop());
    const state = {loaded: true, backdrop: {palette: TEST_PALETTE, dim: 0}};
    act(() => publishPhotoBackdrop(state));
    expect(result.current).toBe(state);
    act(() => publishPhotoBackdrop({loaded: true, backdrop: null}));
    expect(result.current.backdrop).toBeNull();
  });
});
