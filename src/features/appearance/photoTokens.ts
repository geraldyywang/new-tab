/**
 * Theme tokens for a page with a background photo. Surfaces become
 * translucent tints of the photo (src/ui/surfaces.css blurs the photo behind
 * them), so cards read as raised panes of the same image. The theme still
 * picks light or dark panes and the status colours; everything is checked
 * for contrast against the panes over the photo's darkest and lightest
 * regions, after the dim overlay.
 */
import {
  MIN_ACCENT_CONTRAST,
  minContrast,
  mixRgb,
  parseColor,
  roundRgb,
  toHex,
  toHexAlpha,
  towardsContrast,
  type Rgb,
} from '../../theme/color';
import type {PhotoBackdrop} from '../../theme/photoBackdrop';
import type {ThemePreset, TokenName} from './presets';

/** Tokens only see-through or photo panes set; tokens.css has defaults. */
export const PHOTO_TOKEN_NAMES = [
  'surface-overlay',
  'pane-highlight',
  'pane-shadow',
  'text-halo',
] as const;

/** A token a photo can set. */
export type PhotoTokenName = TokenName | (typeof PHOTO_TOKEN_NAMES)[number];

/** The text levels, strongest to faintest. */
export const TEXT_TOKENS = ['fg', 'fg-muted', 'fg-subtle', 'fg-faint'] as const;
type TextToken = (typeof TEXT_TOKENS)[number];
type TextTokens = Record<TextToken, Rgb>;

/**
 * Contrast each text level needs on the panes. Body text needs 4.5:1 (WCAG
 * 1.4.3) and `fg-faint` is for placeholders and decoration; `fg` aims higher
 * so the levels below it have room to fade.
 */
export const TEXT_CONTRAST = {
  fg: 6,
  'fg-muted': 5,
  'fg-subtle': 4.5,
  'fg-faint': 3,
};
/** How far each text level may fade towards the pane, for hierarchy. */
const TEXT_FADE = {fg: 0, 'fg-muted': 0.15, 'fg-subtle': 0.3, 'fg-faint': 0.5};
/** How much more see-through the other scheme's panes must be to win. */
const SCHEME_SWITCH = 0.1;
/** Added to every target, for the browser rounding the drawn panes. */
export const MARGIN = 0.15;

const WHITE: Rgb = {r: 1, g: 1, b: 1};
const BLACK: Rgb = {r: 0, g: 0, b: 0};

/** Per scheme: the pane tint's contrast with ink, and overlay opacities. */
export const SCHEMES = {
  dark: {
    tintContrast: 12,
    paneAlpha: 0.35,
    ink: WHITE,
    shade: BLACK,
    raised: [0.06, 0.12],
    inset: 0.25,
    border: 0.14,
    highlight: 0.16,
    shadow: 0.4,
  },
  light: {
    tintContrast: 15,
    paneAlpha: 0.45,
    ink: BLACK,
    shade: WHITE,
    raised: [0.05, 0.1],
    inset: 0.5,
    border: 0.12,
    highlight: 0.7,
    shadow: 0.2,
  },
} as const;

/** `alpha` as `#rrggbbaa` stores it. */
export function roundAlpha(alpha: number) {
  return Math.round(Math.min(1, Math.max(0, alpha)) * 255) / 255;
}

/** Opacities from `from` up to 1, in 5% steps, as `#rrggbbaa` stores them. */
export function opacitySteps(from: number): number[] {
  const steps: number[] = [];
  for (let step = Math.round(from * 20); step <= 20; step++) {
    steps.push(roundAlpha(step / 20));
  }
  return steps;
}

/** Pane colours behind text: bare, and under the strongest raised control. */
interface Backgrounds {
  bare: Rgb[];
  raised: Rgb[];
}

/**
 * Whether `color` reads as `token` text: its full target on bare panes, and
 * at most body-text contrast on raised controls (buttons, hovers, badges).
 */
function meets(color: Rgb, token: TextToken, {bare, raised}: Backgrounds) {
  const target = TEXT_CONTRAST[token];
  return (
    minContrast(color, bare) >= target + MARGIN &&
    minContrast(color, raised) >= Math.min(target, 4.5) + MARGIN
  );
}

/** Whether every text level reads on `backgrounds`. */
function reads(text: TextTokens, backgrounds: Backgrounds) {
  return TEXT_TOKENS.every(token => meets(text[token], token, backgrounds));
}

/** Text levels for the panes, or `null` if `fg` itself doesn't read. */
function textOn(backgrounds: Backgrounds, fg: Rgb, pane: Rgb) {
  if (!meets(fg, 'fg', backgrounds)) return null;
  // Each level is the palest step from `fg` towards the pane that reads
  function level(token: TextToken) {
    for (let step = Math.round(TEXT_FADE[token] * 20); step > 0; step--) {
      const candidate = roundRgb(mixRgb(fg, pane, step / 20));
      if (meets(candidate, token, backgrounds)) return candidate;
    }
    return fg;
  }
  const text: TextTokens = {
    fg,
    'fg-muted': level('fg-muted'),
    'fg-subtle': level('fg-subtle'),
    'fg-faint': level('fg-faint'),
  };
  return text;
}

type SchemeName = keyof typeof SCHEMES;

/** The panes over each of the `under` colours. */
function panesOver(
  under: readonly Rgb[],
  tint: Rgb,
  alpha: number,
  name: SchemeName,
): Backgrounds {
  const {ink, raised} = SCHEMES[name];
  const bare = under.map(color => mixRgb(color, tint, alpha));
  return {bare, raised: bare.map(pane => mixRgb(pane, ink, raised[1]))};
}
/** Light or dark card panes over the photo, and their text. */
interface CardPanes {
  scheme: SchemeName;
  tint: Rgb;
  alpha: number;
  text: TextTokens;
  /** Whether the text reaches its targets; only a fixed `alpha` can fail. */
  legible: boolean;
}

/**
 * The most see-through `scheme` panes over `photo` whose text reads, trying
 * tinted text first and then pure ink; or, with `fixed`, panes of that
 * opacity, whose text falls back to pure ink when nothing reads. The tint is
 * the photo's `average` darkened (or lightened) until opaque panes read with
 * ink text by far.
 */
function cardPanes(
  scheme: SchemeName,
  photo: Rgb[],
  average: Rgb,
  fixed?: number,
): CardPanes {
  const {ink, shade, tintContrast, paneAlpha} = SCHEMES[scheme];
  const tint = towardsContrast(average, [ink], shade, tintContrast).color;
  const fgTinted = roundRgb(mixRgb(tint, ink, 0.92));
  const alphas =
    fixed === undefined ? opacitySteps(paneAlpha) : [roundAlpha(fixed)];
  for (const alpha of alphas) {
    const backgrounds = panesOver(photo, tint, alpha, scheme);
    const text =
      textOn(backgrounds, fgTinted, tint) ?? textOn(backgrounds, ink, tint);
    if (text) return {scheme, tint, alpha, text, legible: true};
  }
  const text = {fg: ink, 'fg-muted': ink, 'fg-subtle': ink, 'fg-faint': ink};
  return {scheme, tint, alpha: alphas[0], text, legible: fixed === undefined};
}

/** Tokens for a photo, and how its panes came out. */
export interface PhotoTheme {
  scheme: SchemeName;
  tokens: Record<PhotoTokenName, string>;
  /** The opacity Auto picks, 0 to 1. */
  autoOpacity: number;
  /** False when a chosen opacity is too low for text to reach its targets. */
  legible: boolean;
}
/**
 * The tokens for `backdrop` with `preset`; `accent` is the user's custom
 * accent, which wins over the photo's own colour, and `paneOpacity` (0 to 1)
 * the card opacity chosen by the user; unset or `null` is Auto. Panes follow
 * the theme's scheme unless the other one lets clearly more of the photo
 * through.
 */
export function photoTokens(
  {palette, dim}: PhotoBackdrop,
  preset: ThemePreset,
  accent?: string,
  paneOpacity?: number | null,
): PhotoTheme {
  function dimmed(hex: string) {
    return mixRgb(parseColor(hex) ?? BLACK, BLACK, dim);
  }
  const photo = [dimmed(palette.darkest), dimmed(palette.lightest)];
  const average = dimmed(palette.average);
  const own = cardPanes(preset.scheme, photo, average);
  const other = cardPanes(
    preset.scheme === 'dark' ? 'light' : 'dark',
    photo,
    average,
  );
  const auto = other.alpha < own.alpha - SCHEME_SWITCH ? other : own;
  const name = auto.scheme;
  const {tint, alpha, text, legible} =
    paneOpacity == null ? auto : cardPanes(name, photo, average, paneOpacity);
  const scheme = SCHEMES[name];

  // The dialog sits over the page under the 60% scrim: it is at least as
  // opaque as the cards and as Auto's, and their text must read on it too.
  const scrimmed = photo.map(color => mixRgb(color, BLACK, 0.6));
  const overlayAlpha =
    opacitySteps(Math.max(auto.alpha, alpha, 0.8)).find(candidate =>
      reads(text, panesOver(scrimmed, tint, candidate, name)),
    ) ?? 1;
  const everyPane = [
    panesOver(photo, tint, alpha, name),
    panesOver(scrimmed, tint, overlayAlpha, name),
  ].flatMap(({bare, raised}) => [...bare, ...raised]);
  function visible(color: string, ratio: number) {
    const base = parseColor(color) ?? scheme.ink;
    const {color: seen} = towardsContrast(base, everyPane, scheme.ink, ratio);
    return toHex(seen);
  }

  const tokens = {
    backdrop: palette.average,
    surface: toHexAlpha(tint, alpha),
    'surface-overlay': toHexAlpha(tint, overlayAlpha),
    'surface-2': toHexAlpha(scheme.ink, scheme.raised[0]),
    'surface-3': toHexAlpha(scheme.ink, scheme.raised[1]),
    'surface-inset': toHexAlpha(scheme.shade, scheme.inset),
    fg: toHex(text.fg),
    'fg-muted': toHex(text['fg-muted']),
    'fg-subtle': toHex(text['fg-subtle']),
    'fg-faint': toHex(text['fg-faint']),
    border: toHexAlpha(scheme.ink, scheme.border),
    accent: visible(accent ?? palette.vivid, MIN_ACCENT_CONTRAST + MARGIN),
    danger: visible(preset.tokens.danger, 4.5 + MARGIN),
    success: visible(preset.tokens.success, 4.5 + MARGIN),
    warning: preset.tokens.warning,
    'warning-fg': visible(preset.tokens['warning-fg'], 4.5 + MARGIN),
    'pane-highlight': toHexAlpha(WHITE, scheme.highlight),
    'pane-shadow': toHexAlpha(BLACK, scheme.shadow),
    'text-halo': toHexAlpha(scheme.shade, 0.75),
  };
  return {scheme: name, tokens, autoOpacity: auto.alpha, legible};
}
