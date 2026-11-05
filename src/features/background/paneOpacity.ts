/**
 * What the pane opacity control needs to know: the opacity Auto would pick
 * for the current photo and theme, and whether a chosen opacity still lets
 * the card text read.
 */
import {useMemo} from 'react';
import {currentThemeEnvironment} from '../appearance/applyTheme';
import {photoTokens, type PhotoTheme} from '../appearance/photoTokens';
import {presetById} from '../appearance/presets';
import {resolvePresetId, themeSlice} from '../appearance/themeSettings';
import {usePreviewedSlice} from '../../settings/slicePreview';
import {useBackgroundImage} from './backgroundImage';
import type {BackgroundDisplay} from './settings';

/** How the cards come out for some display options. */
export interface PaneReadability {
  /** Auto's opacity, in whole %. */
  autoOpacity: number;
  /** Show "Text may be hard to read": a chosen opacity is too low. */
  warn: boolean;
}

/** The readability of `display`'s cards, given the theme they produced. */
export function paneReadability(
  display: BackgroundDisplay,
  theme: Pick<PhotoTheme, 'autoOpacity' | 'legible'>,
): PaneReadability {
  return {
    autoOpacity: Math.round(theme.autoOpacity * 100),
    warn: display.paneOpacity !== null && !theme.legible,
  };
}

/**
 * The readability of `display`'s cards over the current photo and theme;
 * `null` without a photo, when there are no photo panes to adjust.
 */
export function usePaneReadability(
  display: BackgroundDisplay,
): PaneReadability | null {
  const {palette} = useBackgroundImage();
  const {value: settings} = usePreviewedSlice(themeSlice);
  return useMemo(() => {
    if (!palette) return null;
    const preset = presetById(
      resolvePresetId(settings, currentThemeEnvironment()),
    );
    const theme = photoTokens(
      {
        palette,
        dim: display.dim / 100,
        paneOpacity:
          display.paneOpacity === null ? null : display.paneOpacity / 100,
      },
      preset,
      settings.accent,
    );
    return paneReadability(display, theme);
  }, [palette, settings, display]);
}
