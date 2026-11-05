import {describe, expect, it} from 'vitest';
import {
  contrastRatio,
  minContrast,
  mixRgb,
  parseColor,
  type Rgb,
} from '../../theme/color';
import {GLOW, glassTokens, LIGHT} from './glassTokens';
import {TEXT_CONTRAST, TEXT_TOKENS} from './photoTokens';
import {ACCENT_PRESETS, presetById, THEME_PRESETS} from './presets';

function color(text: string): Rgb {
  const parsed = parseColor(text.slice(0, 7)) ?? parseColor(text);
  if (!parsed) throw new Error(`Unparseable colour ${text}`);
  return parsed;
}

function alphaOf(hex: string) {
  return parseInt(hex.slice(7, 9), 16) / 255;
}

/** What a pane of `surface` (with alpha) shows over each of `under`. */
function panes(surface: string, under: Rgb[]) {
  return under.map(c => mixRgb(c, color(surface), alphaOf(surface)));
}

const WHITE: Rgb = {r: 1, g: 1, b: 1};
const ACCENTS = [undefined, ...ACCENT_PRESETS.map(a => a.color), '#ffffff'];

describe('glassTokens', () => {
  describe.each(THEME_PRESETS.map(p => [p.id, p] as const))(
    '%s',
    (_, preset) => {
      it.each(ACCENTS)('keeps text readable over the glow of %s', accent => {
        const drawn = accent ?? preset.tokens.accent;
        const {tokens, autoOpacity, legible, scheme} = glassTokens(
          preset,
          drawn,
        );
        expect(scheme).toBe(preset.scheme);
        expect(legible).toBe(true);
        expect(autoOpacity).toBeGreaterThanOrEqual(0.6);
        expect(alphaOf(tokens.surface)).toBeCloseTo(autoOpacity, 2);
        expect(alphaOf(tokens['surface-overlay'])).toBeGreaterThanOrEqual(
          autoOpacity,
        );
        const backdrop = color(preset.tokens.backdrop);
        const under = [
          backdrop,
          mixRgb(backdrop, WHITE, LIGHT[preset.scheme]),
          mixRgb(backdrop, color(drawn), GLOW),
        ];
        const solid = color(preset.tokens.surface);
        for (const token of TEXT_TOKENS) {
          const text = color(preset.tokens[token]);
          // The theme's own text colours, as on solid surfaces
          expect(tokens[token]).toBe(preset.tokens[token]);
          const target = Math.min(
            TEXT_CONTRAST[token],
            0.9 * contrastRatio(text, solid),
          );
          expect(
            minContrast(text, panes(tokens.surface, under)),
          ).toBeGreaterThan(target);
        }
      });
    },
  );

  it('flags a chosen opacity too low to read, and honours it', () => {
    const light = presetById('light');
    const clear = glassTokens(light, '#fbbf24', 0);
    expect(clear.legible).toBe(false);
    expect(alphaOf(clear.tokens.surface)).toBe(0);
    const opaque = glassTokens(light, '#fbbf24', 1);
    expect(opaque.legible).toBe(true);
    expect(alphaOf(opaque.tokens.surface)).toBe(1);
  });
});
