import {describe, expect, it} from 'vitest';
import type {PhotoPalette} from '../background/photoPalette';
import {
  contrastRatio,
  MIN_ACCENT_CONTRAST,
  mixRgb,
  parseColor,
  toHex,
  type Rgb,
} from './color';
import {photoTokens, type PhotoBackdrop} from './photoTokens';
import {presetById, THEME_PRESETS} from './presets';

const BLACK: Rgb = {r: 0, g: 0, b: 0};

function tokensFor(...args: Parameters<typeof photoTokens>) {
  return photoTokens(...args).tokens;
}

function rgb(text: string): Rgb {
  const parsed = parseColor(text.slice(0, 7));
  if (!parsed) throw new Error(`Unparseable colour ${text}`);
  return parsed;
}

/** `#rrggbb` is opaque; `#rrggbbaa` carries its alpha. */
function alphaOf(text: string) {
  return text.length === 9 ? parseInt(text.slice(7), 16) / 255 : 1;
}

/** Draws `top` (maybe translucent) over the opaque `bottom`, as CSS does. */
function over(top: string, bottom: Rgb): Rgb {
  return mixRgb(bottom, rgb(top), alphaOf(top));
}

const BRIGHT: PhotoPalette = {
  average: '#c8d6e5',
  darkest: '#8aa1b8',
  lightest: '#ffffff',
  vivid: '#4d8fd6',
};
const DARK: PhotoPalette = {
  average: '#1a1f2b',
  darkest: '#000000',
  lightest: '#3a4256',
  vivid: '#7a3fb0',
};
const HIGH_RANGE: PhotoPalette = {
  average: '#7f6a55',
  darkest: '#050505',
  lightest: '#fafafa',
  vivid: '#ff2a00',
};
const MID: PhotoPalette = {
  average: '#777777',
  darkest: '#6a6a6a',
  lightest: '#8a8a8a',
  vivid: '#808080',
};

const TWILIGHT: PhotoPalette = {
  average: '#8a7f99',
  darkest: '#5e5470',
  lightest: '#b3a9c4',
  vivid: '#c86fa0',
};

const PALETTES = {BRIGHT, DARK, HIGH_RANGE, MID, TWILIGHT};
const CASES = THEME_PRESETS.flatMap(preset =>
  Object.entries(PALETTES).flatMap(([name, palette]) =>
    [0, 0.2, 0.8].map(dim => ({preset, name, backdrop: {palette, dim}})),
  ),
);

/** What the eye sees behind text: the panes over each photo extreme. */
function panesBehindText(
  tokens: Record<string, string>,
  {palette, dim}: PhotoBackdrop,
) {
  const photo = [palette.darkest, palette.lightest].map(hex =>
    mixRgb(rgb(hex), BLACK, dim),
  );
  const scrimmed = photo.map(color => mixRgb(color, BLACK, 0.6));
  const cards = photo.map(color => over(tokens.surface, color));
  const dialog = scrimmed.map(color => over(tokens['surface-overlay'], color));
  const bare = [...cards, ...dialog];
  // Buttons, hovers and letter badges on the panes
  const raised = bare.flatMap(pane => [
    over(tokens['surface-2'], pane),
    over(tokens['surface-3'], pane),
  ]);
  return {bare, raised};
}

describe('photoTokens', () => {
  it.each(CASES)(
    'keeps text readable: $name photo, $preset.id, dim $backdrop.dim',
    ({preset, backdrop}) => {
      const tokens = tokensFor(backdrop, preset);
      const {bare, raised} = panesBehindText(tokens, backdrop);
      function lowest(token: keyof typeof tokens, panes: Rgb[]) {
        return Math.min(
          ...panes.map(pane => contrastRatio(rgb(tokens[token]), pane)),
        );
      }
      const targets = [
        ['fg', 6],
        ['fg-muted', 5],
        ['fg-subtle', 4.5],
        ['fg-faint', 3],
      ] as const;
      for (const [token, target] of targets) {
        expect(lowest(token, bare)).toBeGreaterThanOrEqual(target);
        // Body text, at least, on raised controls
        expect(lowest(token, raised)).toBeGreaterThanOrEqual(
          Math.min(target, 4.5),
        );
      }
      const all = [...bare, ...raised];
      expect(lowest('danger', all)).toBeGreaterThanOrEqual(4.5);
      expect(lowest('accent', all)).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
    },
  );
  it('tints the panes with the photo and lets it show through', () => {
    const tokens = tokensFor({palette: DARK, dim: 0}, presetById('stone'));
    expect(alphaOf(tokens.surface)).toBeLessThan(0.6);
    const tint = rgb(tokens.surface);
    // Bluish like the photo, not neutral grey
    expect(tint.b).toBeGreaterThan(tint.r);
    expect(tokens.backdrop).toBe(DARK.average);
  });

  it('makes the panes more opaque when the photo varies a lot', () => {
    const calm = tokensFor({palette: DARK, dim: 0}, presetById('stone'));
    const busy = tokensFor({palette: HIGH_RANGE, dim: 0}, presetById('stone'));
    expect(alphaOf(busy.surface)).toBeGreaterThan(alphaOf(calm.surface));
  });

  it('gives the dialog a stronger tint than the cards', () => {
    const tokens = tokensFor({palette: BRIGHT, dim: 0}, presetById('light'));
    expect(alphaOf(tokens['surface-overlay'])).toBeGreaterThanOrEqual(0.8);
    expect(alphaOf(tokens['surface-overlay'])).toBeGreaterThanOrEqual(
      alphaOf(tokens.surface),
    );
  });

  it("follows the theme's scheme when both suit the photo", () => {
    const backdrop = {palette: MID, dim: 0};
    const light = photoTokens(backdrop, presetById('light'));
    const dark = photoTokens(backdrop, presetById('nord'));
    expect(light.scheme).toBe('light');
    expect(rgb(light.tokens.fg).r).toBeLessThan(0.3);
    expect(dark.scheme).toBe('dark');
    expect(rgb(dark.tokens.fg).r).toBeGreaterThan(0.7);
  });

  it('switches scheme when the other lets much more of the photo through', () => {
    expect(
      photoTokens({palette: BRIGHT, dim: 0}, presetById('nord')).scheme,
    ).toBe('light');
    expect(
      photoTokens({palette: DARK, dim: 0}, presetById('light')).scheme,
    ).toBe('dark');
  });

  it("uses the photo's vivid colour as the accent, or the user's", () => {
    const backdrop = {palette: DARK, dim: 0};
    const stone = presetById('stone');
    const fromPhoto = rgb(tokensFor(backdrop, stone).accent);
    expect(fromPhoto.r).toBeGreaterThan(fromPhoto.g);
    expect(tokensFor(backdrop, stone, '#2dd4bf').accent).toBe('#2dd4bf');
  });

  it('only outputs colours the browser can draw as given', () => {
    const tokens = tokensFor(
      {palette: BRIGHT, dim: 0.2},
      presetById('dracula'),
    );
    for (const value of Object.values(tokens)) {
      expect(value).toMatch(/^#[\da-f]{6}([\da-f]{2})?$/);
      expect(toHex(rgb(value))).toBe(value.slice(0, 7));
    }
  });
});
