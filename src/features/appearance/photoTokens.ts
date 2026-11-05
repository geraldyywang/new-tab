/**
 * Theme tokens for a page with a background photo. Surfaces become
 * translucent tints of the photo (src/ui/surfaces.css blurs the photo behind
 * them), so cards read as raised panes of the same image. The theme still
 * picks light or dark panes and the status colours; everything is checked
 * for contrast against the panes over the photo's darkest and lightest
 * regions, after the dim overlay.
 */
import type {PhotoPalette} from '../background/photoPalette';
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
} from './color';
import type {ThemePreset, TokenName} from './presets';

/** The background photo, as far as theming is concerned. */
export interface PhotoBackdrop {
  palette: PhotoPalette;
  /** Strength of the dim overlay, 0 to 1. */
  dim: number;
}

/** Tokens only a photo sets; tokens.css gives their photo-less defaults. */
export const PHOTO_TOKEN_NAMES = [
  'surface-overlay',
  'pane-highlight',
  'pane-shadow',
] as const;

/** A token a photo can set. */
export type PhotoTokenName = TokenName | (typeof PHOTO_TOKEN_NAMES)[number];

const TEXT_TOKENS = ['fg', 'fg-muted', 'fg-subtle', 'fg-faint'] as const;
type TextTokens = Record<(typeof TEXT_TOKENS)[number], Rgb>;

/**
 * Contrast each text level needs against every pane. Body text needs 4.5:1
 * (WCAG 1.4.3), `fg-faint` is for placeholders and decoration; `fg` aims
 * higher so the levels below it have room to fade.
 */
const TEXT_CONTRAST = {fg: 7, 'fg-muted': 5.5, 'fg-subtle': 4.5, 'fg-faint': 3};
/** How far each text level may fade towards the pane, for hierarchy. */
const TEXT_FADE = {fg: 0, 'fg-muted': 0.15, 'fg-subtle': 0.3, 'fg-faint': 0.5};
/** Added to every target, for the browser rounding the drawn panes. */
const MARGIN = 0.15;

const WHITE: Rgb = {r: 1, g: 1, b: 1};
const BLACK: Rgb = {r: 0, g: 0, b: 0};

/** Per scheme: the pane tint's contrast with ink, and overlay opacities. */
const SCHEMES = {
  dark: {
    tintContrast: 12,
    paneAlpha: 0.35,
    ink: WHITE,
    shade: BLACK,
    raised: [0.08, 0.16],
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

/** Opacities from `from` up to 1, in 5% steps, as `#rrggbbaa` stores them. */
function opacitySteps(from: number): number[] {
  const steps: number[] = [];
  for (let step = Math.round(from * 20); step <= 20; step++) {
    steps.push(Math.round((step / 20) * 255) / 255);
  }
  return steps;
}

/** Whether every text level reaches its contrast on `backgrounds`. */
function reads(text: TextTokens, backgrounds: readonly Rgb[]) {
  return TEXT_TOKENS.every(
    token =>
      minContrast(text[token], backgrounds) >= TEXT_CONTRAST[token] + MARGIN,
  );
}

/** Text levels for the panes, or `null` if `fg` can't reach its target. */
function textOn(backgrounds: readonly Rgb[], fg: Rgb, pane: Rgb) {
  if (minContrast(fg, backgrounds) < TEXT_CONTRAST.fg + MARGIN) return null;
  // Each level is the palest step from `fg` towards the pane that still reads
  function level(token: (typeof TEXT_TOKENS)[number]) {
    const faded = mixRgb(fg, pane, TEXT_FADE[token]);
    const ratio = TEXT_CONTRAST[token] + MARGIN;
    return towardsContrast(faded, backgrounds, fg, ratio).color;
  }
  const text: TextTokens = {
    fg,
    'fg-muted': level('fg-muted'),
    'fg-subtle': level('fg-subtle'),
    'fg-faint': level('fg-faint'),
  };
  return text;
}

/**
 * The tokens for `backdrop` with `preset`; `accent` is the user's custom
 * accent, which wins over the photo's own colour.
 */
export function photoTokens(
  {palette, dim}: PhotoBackdrop,
  preset: ThemePreset,
  accent?: string,
): Record<PhotoTokenName, string> {
  const scheme = SCHEMES[preset.scheme];
  function dimmed(hex: string) {
    return mixRgb(parseColor(hex) ?? BLACK, BLACK, dim);
  }
  const photo = [dimmed(palette.darkest), dimmed(palette.lightest)];
  // The dialog's backdrop is the page under the 60% scrim
  const scrimmed = photo.map(color => mixRgb(color, BLACK, 0.6));
  // The photo's average colour, darkened (or lightened) for a calm pane;
  // opaque, it alone gives ink text well over 7:1
  const tint = towardsContrast(
    dimmed(palette.average),
    [scheme.ink],
    scheme.shade,
    scheme.tintContrast,
  ).color;
  const fgTinted = roundRgb(mixRgb(tint, scheme.ink, 0.92));

  /** Pane colours over `under`, bare and under the strongest raised control. */
  function panes(under: readonly Rgb[], alpha: number) {
    return under.flatMap(color => {
      const pane = mixRgb(color, tint, alpha);
      return [pane, mixRgb(pane, scheme.ink, scheme.raised[1])];
    });
  }
  // The most see-through pane whose text reads, trying tinted text first
  // and then pure ink; an opaque pane always reads, given the tint
  const ink = Object.fromEntries(TEXT_TOKENS.map(t => [t, scheme.ink]));
  let alpha = 1;
  let text = ink as TextTokens; // every level mapped
  for (const candidate of opacitySteps(scheme.paneAlpha)) {
    const backgrounds = panes(photo, candidate);
    const found =
      textOn(backgrounds, fgTinted, tint) ??
      textOn(backgrounds, scheme.ink, tint);
    if (found) {
      [alpha, text] = [candidate, found];
      break;
    }
  }

  // The dialog: at least as opaque as the cards, and its text must read too
  const overlayAlpha =
    opacitySteps(Math.max(alpha, 0.8)).find(candidate =>
      reads(text, panes(scrimmed, candidate)),
    ) ?? 1;
  const everyPane = [...panes(photo, alpha), ...panes(scrimmed, overlayAlpha)];
  function visible(color: string, ratio: number) {
    const base = parseColor(color) ?? scheme.ink;
    const {color: seen} = towardsContrast(base, everyPane, scheme.ink, ratio);
    return toHex(seen);
  }

  return {
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
  };
}
