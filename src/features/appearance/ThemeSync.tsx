import {useEffect} from 'react';
import {usePreviewedSlice} from '../../settings/slicePreview';
import {useSlice} from '../../settings/slices';
import {writeThemeCache} from './applyTheme';
import {themeSlice} from './themeSettings';
import {watchTheme} from './watchTheme';

/**
 * Keeps `<html>` in the saved (or previewed) theme and caches the saved
 * settings for the next load. Renders nothing.
 */
export function ThemeSync() {
  const saved = useSlice(themeSlice);
  const {loaded, value: settings} = usePreviewedSlice(themeSlice);

  useEffect(() => {
    if (saved.loaded) writeThemeCache(saved.value);
  }, [saved]);

  useEffect(() => {
    // Until storage answers, keep the theme main.tsx applied from the cache
    if (!loaded) return;
    return watchTheme(document.documentElement, settings);
  }, [loaded, settings]);

  return null;
}
