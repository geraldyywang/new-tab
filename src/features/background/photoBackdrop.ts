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
import {backgroundDisplaySlice, type BackgroundDisplay} from './settings';

/** Dim and pane opacity of `display` as fractions, as theming takes them. */
function fractions({dim, paneOpacity}: BackgroundDisplay) {
  return {
    dim: dim / 100,
    paneOpacity: paneOpacity === null ? null : paneOpacity / 100,
  };
}

/**
 * The current photo backdrop, with the dim and pane opacity of the display
 * options being edited, if any; caches the saved one.
 */
export function useCurrentPhotoBackdrop(
  store = BACKGROUND_IMAGE,
): PhotoBackdropState {
  const {loaded: imageLoaded, palette} = useBackgroundImage(store);
  const saved = useSlice(backgroundDisplaySlice);
  const {dim, paneOpacity} = fractions(useBackgroundDisplay());
  const loaded = imageLoaded && saved.loaded;
  const savedDisplay = fractions(saved.value);
  const [savedDim, savedOpacity] = [savedDisplay.dim, savedDisplay.paneOpacity];

  useEffect(() => {
    if (!loaded) return;
    const dim = savedDim;
    writePhotoCache(palette ? {palette, dim, paneOpacity: savedOpacity} : null);
  }, [loaded, palette, savedDim, savedOpacity]);

  return useMemo(
    () => ({
      loaded,
      backdrop: palette ? {palette, dim, paneOpacity} : null,
    }),
    [loaded, palette, dim, paneOpacity],
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
