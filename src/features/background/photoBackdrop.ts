/**
 * The background photo as theming needs it: its palette and the dim
 * strength. The saved state is cached in `localStorage`, so the next page
 * load can tint the cards before IndexedDB answers.
 * Published to theming through src/theme/photoBackdrop.ts.
 */
import {useEffect, useMemo} from 'react';
import {useSlice} from '../../settings/slices';
import {
  publishPhotoBackdrop,
  writePhotoCache,
  type PhotoBackdropState,
} from '../../theme/photoBackdrop';
import {
  BACKGROUND_IMAGE,
  useBackgroundImage,
  type BackgroundImageStore,
} from './backgroundImage';
import {useBackgroundDisplay} from './displayPreview';
import {backgroundDisplaySlice} from './settings';

/**
 * The current photo backdrop, with the dim of the display options being
 * edited, if any; caches the saved one.
 */
export function useCurrentPhotoBackdrop(
  store = BACKGROUND_IMAGE,
): PhotoBackdropState {
  const {loaded: imageLoaded, palette} = useBackgroundImage(store);
  const saved = useSlice(backgroundDisplaySlice);
  const dim = useBackgroundDisplay().dim / 100;
  const loaded = imageLoaded && saved.loaded;
  const savedDim = saved.value.dim / 100;

  useEffect(() => {
    if (!loaded) return;
    writePhotoCache(palette ? {palette, dim: savedDim} : null);
  }, [loaded, palette, savedDim]);

  return useMemo(
    () => ({loaded, backdrop: palette ? {palette, dim} : null}),
    [loaded, palette, dim],
  );
}

/** Keeps the published photo backdrop current. Renders nothing. */
export function PhotoBackdropSync({
  store = BACKGROUND_IMAGE,
}: {
  /** Photo source; the page's stored photo unless a test passes one. */
  store?: BackgroundImageStore;
}) {
  const state = useCurrentPhotoBackdrop(store);
  useEffect(() => publishPhotoBackdrop(state), [state]);
  return null;
}
