/**
 * Theme tokens for see-through surfaces without a background photo. The
 * panes are the theme's own surface colour, made translucent over the theme
 * backdrop, a soft white light and a glow of the accent (src/ui/surfaces.css).
 * They stay opaque enough for every text level to keep its contrast: its
 * photo target, or most of what it has on the solid surface if that is less.
 */
import {
  contrastRatio,
  minContrast,
  mixRgb,
  parseColor,
  toHexAlpha,
  type Rgb,
} from '../../theme/color';
import {
  MARGIN,
  opacitySteps,
  roundAlpha,
  SCHEMES,
  TEXT_CONTRAST,
  TEXT_TOKENS,
  type PhotoTheme,
  type PhotoTokenName,
} from './photoTokens';
import type {ThemePreset} from './presets';

/** Tokens only see-through panes without a photo set. */
export const GLASS_TOKEN_NAMES = ['backdrop-light', 'backdrop-glow'] as const;

/** A token see-through panes can set, with or without a photo. */
export type PaneTokenName = PhotoTokenName | (typeof GLASS_TOKEN_NAMES)[number];

/** Strength of the accent glow behind the panes, at its brightest. */
export const GLOW = 0.3;
/** Strength of the white light on the backdrop, per scheme. */
export const LIGHT = {dark: 0.08, light: 0.7};
/** Auto's most see-through panes; below this cards melt into the page. */
const MIN_ALPHA = 0.6;
/** Share of its contrast on the solid surface a text level keeps. */
const KEEP = 0.9;

const WHITE: Rgb = {r: 1, g: 1, b: 1};
const BLACK: Rgb = {r: 0, g: 0, b: 0};

function parsed(color: string): Rgb {
  return parseColor(color) ?? BLACK;
}

/** Tokens for see-through panes, and how they came out. */
export interface GlassTheme extends Omit<PhotoTheme, 'tokens'> {
  tokens: Record<PaneTokenName, string>;
}

/**
 * Tokens for see-through panes of `preset` without a photo; `accent` is the
 * accent as drawn and `paneOpacity` (0 to 1) the user's card opacity, with
 * unset or `null` for Auto.
 */
export function glassTokens(
  preset: ThemePreset,
  accent: string,
  paneOpacity?: number | null,
): GlassTheme {
  const {tokens, scheme: name} = preset;
  const scheme = SCHEMES[name];
  const surface = parsed(tokens.surface);
  const backdrop = parsed(tokens.backdrop);
  const under = [
    backdrop,
    mixRgb(backdrop, WHITE, LIGHT[name]),
    mixRgb(backdrop, parsed(accent), GLOW),
  ];
  const targets = TEXT_TOKENS.map(token => {
    const color = parsed(tokens[token]);
    const solid = contrastRatio(color, surface);
    return {
      color,
      ratio: Math.min(TEXT_CONTRAST[token] + MARGIN, KEEP * solid),
    };
  });
  function reads(alpha: number, behind: readonly Rgb[]) {
    const panes = behind.map(color => mixRgb(color, surface, alpha));
    return targets.every(
      ({color, ratio}) => minContrast(color, panes) >= ratio,
    );
  }

  const auto = opacitySteps(MIN_ALPHA).find(alpha => reads(alpha, under)) ?? 1;
  const alpha = paneOpacity == null ? auto : roundAlpha(paneOpacity);
  // The dialog, under the 60% scrim, is at least as opaque as the cards
  const scrimmed = under.map(color => mixRgb(color, BLACK, 0.6));
  const overlayAlpha =
    opacitySteps(Math.max(auto, alpha, 0.8)).find(candidate =>
      reads(candidate, scrimmed),
    ) ?? 1;

  return {
    scheme: name,
    tokens: {
      ...tokens,
      accent,
      surface: toHexAlpha(surface, alpha),
      'surface-overlay': toHexAlpha(surface, overlayAlpha),
      'pane-highlight': toHexAlpha(WHITE, scheme.highlight),
      'pane-shadow': toHexAlpha(BLACK, scheme.shadow),
      'text-halo': toHexAlpha(scheme.shade, 0.75),
      'backdrop-light': toHexAlpha(WHITE, LIGHT[name]),
      'backdrop-glow': toHexAlpha(parsed(accent), GLOW),
    },
    autoOpacity: auto,
    legible: reads(alpha, under),
  };
}
