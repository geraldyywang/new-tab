import {useEffect} from 'react';
import {usePreviewedSlice} from '../../settings/slicePreview';
import {useSlice} from '../../settings/slices';
import {usePhotoBackdrop} from '../../theme/photoBackdrop';
import {writeThemeCache} from './applyTheme';
import {themeSlice} from './themeSettings';
import {watchTheme} from './watchTheme';

/**
 * Keeps `<html>` in the saved (or previewed) theme, tinted by the background
 * photo if there is one, and caches the saved settings for the next load.
 * Renders nothing.
 */
export function ThemeSync() {
  const saved = useSlice(themeSlice);
  const {loaded, value: settings} = usePreviewedSlice(themeSlice);
  const {loaded: photoLoaded, backdrop} = usePhotoBackdrop();

  useEffect(() => {
    if (saved.loaded) writeThemeCache(saved.value);
  }, [saved]);

  useEffect(() => {
    // Until storage answers, keep what main.tsx applied from the caches
    if (!loaded || !photoLoaded) return;
    return watchTheme(document.documentElement, settings, backdrop);
  }, [loaded, settings, photoLoaded, backdrop]);

  return null;
}
