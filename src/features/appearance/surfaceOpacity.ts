/**
 * What the surface opacity control needs to know: the opacity Auto would
 * pick for the current photo (or the theme backdrop), and whether a chosen
 * opacity still lets the card text read.
 */
import {useMemo} from 'react';
import {usePhotoBackdrop} from '../../theme/photoBackdrop';
import {currentThemeEnvironment, paneTheme} from './applyTheme';
import type {PhotoTheme} from './photoTokens';
import {presetById} from './presets';
import {resolvePresetId, type ThemeSettings} from './themeSettings';

/** How the cards come out at some opacity. */
export interface PaneReadability {
  /** Auto's opacity, in whole %. */
  autoOpacity: number;
  /** Show "Text may be hard to read": a chosen opacity is too low. */
  warn: boolean;
}

/** The readability of cards at `opacity` (%), given the theme it produced. */
export function paneReadability(
  opacity: number | null,
  theme: Pick<PhotoTheme, 'autoOpacity' | 'legible'>,
): PaneReadability {
  return {
    autoOpacity: Math.round(theme.autoOpacity * 100),
    warn: opacity !== null && !theme.legible,
  };
}

/** The readability of the see-through cards `settings` draw. */
export function usePaneReadability(settings: ThemeSettings): PaneReadability {
  const {backdrop} = usePhotoBackdrop();
  return useMemo(() => {
    const preset = presetById(
      resolvePresetId(settings, currentThemeEnvironment()),
    );
    const {accent, surfaceOpacity} = settings;
    const theme = paneTheme(preset, accent, surfaceOpacity, backdrop);
    return paneReadability(surfaceOpacity, theme);
  }, [backdrop, settings]);
}
