/**
 * What the surface opacity control needs to know: the opacity Auto would
 * pick for the current photo and theme, and whether a chosen opacity still
 * lets the card text read.
 */
import {useMemo} from 'react';
import {usePhotoBackdrop} from '../../theme/photoBackdrop';
import {currentThemeEnvironment} from './applyTheme';
import {photoTokens, type PhotoTheme} from './photoTokens';
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

/**
 * The readability of the cards `settings` draw over the current photo;
 * `null` without a photo, when there are no photo panes to adjust.
 */
export function usePaneReadability(
  settings: ThemeSettings,
): PaneReadability | null {
  const {backdrop} = usePhotoBackdrop();
  return useMemo(() => {
    if (!backdrop) return null;
    const preset = presetById(
      resolvePresetId(settings, currentThemeEnvironment()),
    );
    const {surfaceOpacity: opacity} = settings;
    const theme = photoTokens(
      backdrop,
      preset,
      settings.accent,
      opacity === null ? null : opacity / 100,
    );
    return paneReadability(opacity, theme);
  }, [backdrop, settings]);
}
