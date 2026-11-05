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
  toHex,
  toHexAlpha,
  towardsContrast,
  type Rgb,
} from '../../theme/color';
import {
  MARGIN,
  opacitySteps,
  roundAlpha,
  SCHEMES,
  TEXT_CONTRAST,
  TEXT_TOKENS,
  type Lit,
  type PhotoTheme,
  type PhotoTokenName,
} from './photoTokens';
import type {ThemePreset} from './presets';

/** Tokens only see-through panes without a photo set. */
export const GLASS_TOKEN_NAMES = ['backdrop-light', 'backdrop-glow'] as const;

/** A token see-through panes can set, with or without a photo. */
export type PaneTokenName = PhotoTokenName | (typeof GLASS_TOKEN_NAMES)[number];

/**
 * Per scheme, how much white liquid glass adds: along its rim, at the
 * centre of the sheen and along the inside of its edges. Sheen and inner
 * highlight can lie behind text, so text must read on panes lit by both.
 */
export const GLASS_LIGHT = {
  dark: {rim: 0.75, sheen: 0.07, inner: 0.05},
  light: {rim: 0.95, sheen: 0.5, inner: 0.4},
};

/** How far liquid glass lights the panes behind text, per scheme. */
export const GLASS_LIT: Lit = {
  dark: GLASS_LIGHT.dark.sheen + GLASS_LIGHT.dark.inner,
  light: GLASS_LIGHT.light.sheen + GLASS_LIGHT.light.inner,
};

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
 * unset or `null` for Auto. Where the glass lights the panes by `lit`, text
 * levels that would fall short are moved towards white (or black) until they
 * read.
 */
export function glassTokens(
  preset: ThemePreset,
  accent: string,
  paneOpacity?: number | null,
  lit = 0,
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
    const ratio = Math.min(TEXT_CONTRAST[token] + MARGIN, KEEP * solid);
    // On raised controls: body-text contrast, or most of the solid theme's
    const onRaised = KEEP * contrastRatio(color, parsed(tokens['surface-3']));
    return {token, color, ratio, body: Math.min(ratio, 4.5 + MARGIN, onRaised)};
  });
  function panes(alpha: number, behind: readonly Rgb[], light = lit) {
    const bare = behind.map(color => mixRgb(color, surface, alpha));
    return [...bare, ...bare.map(pane => mixRgb(pane, WHITE, light))];
  }
  function reads(text: readonly Rgb[], behind: readonly Rgb[]) {
    return targets.every(({ratio}, i) => minContrast(text[i], behind) >= ratio);
  }

  const original = targets.map(({color}) => color);
  const auto =
    opacitySteps(MIN_ALPHA).find(alpha =>
      reads(original, panes(alpha, under, 0)),
    ) ?? 1;
  const alpha = paneOpacity == null ? auto : roundAlpha(paneOpacity);
  // The dialog, under the 60% scrim, is at least as opaque as the cards
  const scrimmed = under.map(color => mixRgb(color, BLACK, 0.6));
  const overlayAlpha =
    opacitySteps(Math.max(auto, alpha, 0.8)).find(candidate =>
      reads(original, panes(candidate, scrimmed, 0)),
    ) ?? 1;
  // Text reads on the panes, and at least as body text on raised controls
  // (buttons, hovers), which are a touch of ink over the pane like a photo's
  const behind = [...panes(alpha, under), ...panes(overlayAlpha, scrimmed)];
  const raised = behind.map(pane => mixRgb(pane, scheme.ink, scheme.raised[1]));
  const adjusted = targets.map(({color, ratio, body}) => {
    const bare = towardsContrast(color, behind, scheme.ink, ratio);
    const lifted = towardsContrast(bare.color, raised, scheme.ink, body);
    return {color: lifted.color, amount: bare.amount + lifted.amount};
  });
  const text = Object.fromEntries(
    adjusted.map(({color, amount}, i) => {
      const {token} = targets[i];
      return [token, amount === 0 ? tokens[token] : toHex(color)];
    }),
  );

  return {
    scheme: name,
    tokens: {
      ...tokens,
      ...text,
      accent,
      surface: toHexAlpha(surface, alpha),
      'surface-overlay': toHexAlpha(surface, overlayAlpha),
      'surface-2': toHexAlpha(scheme.ink, scheme.raised[0]),
      'surface-3': toHexAlpha(scheme.ink, scheme.raised[1]),
      'pane-highlight': toHexAlpha(WHITE, scheme.highlight),
      'pane-shadow': toHexAlpha(BLACK, scheme.shadow),
      'text-halo': toHexAlpha(scheme.shade, 0.75),
      'backdrop-light': toHexAlpha(WHITE, LIGHT[name]),
      'backdrop-glow': toHexAlpha(parsed(accent), GLOW),
    },
    autoOpacity: auto,
    legible: adjusted.every(
      ({color}, i) =>
        minContrast(color, behind) >= targets[i].ratio &&
        minContrast(color, raised) >= targets[i].body,
    ),
  };
}
