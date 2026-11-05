import {describe, expect, it} from 'vitest';
import {
  contrastRatio,
  minContrast,
  mixRgb,
  parseColor,
  type Rgb,
} from '../../theme/color';
import {GLOW, GLASS_LIT, glassTokens, LIGHT} from './glassTokens';
import {SCHEMES, TEXT_CONTRAST, TEXT_TOKENS} from './photoTokens';
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
const BLACK: Rgb = {r: 0, g: 0, b: 0};
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

  it('moves text towards ink to read on a chosen opacity, or flags it', () => {
    const light = presetById('light');
    const clear = glassTokens(light, '#fbbf24', 0);
    expect(alphaOf(clear.tokens.surface)).toBe(0);
    expect(clear.legible).toBe(true);
    expect(clear.tokens['fg-faint']).not.toBe(light.tokens['fg-faint']);
    const opaque = glassTokens(light, '#fbbf24', 1);
    expect(alphaOf(opaque.tokens.surface)).toBe(1);
    // Panes lit all the way to white leave white text nothing to stand on
    expect(glassTokens(presetById('stone'), '#60a5fa', 0.6, 1).legible).toBe(
      false,
    );
  });

  it.each(THEME_PRESETS.map(p => [p.id, p] as const))(
    'keeps %s text readable where liquid glass lights the panes',
    (_, preset) => {
      const lit = GLASS_LIT[preset.scheme];
      const {tokens, legible} = glassTokens(
        preset,
        preset.tokens.accent,
        null,
        lit,
      );
      expect(legible).toBe(true);
      const backdrop = color(preset.tokens.backdrop);
      const solid = color(preset.tokens.surface);
      const under = [
        backdrop,
        mixRgb(backdrop, WHITE, LIGHT[preset.scheme]),
        mixRgb(backdrop, color(preset.tokens.accent), GLOW),
      ];
      const bare = panes(tokens.surface, under);
      const lighted = bare.map(pane => mixRgb(pane, WHITE, lit));
      for (const token of TEXT_TOKENS) {
        const target = Math.min(
          TEXT_CONTRAST[token],
          0.9 * contrastRatio(color(preset.tokens[token]), solid),
        );
        expect(
          minContrast(color(tokens[token]), [...bare, ...lighted]),
        ).toBeGreaterThan(target);
        // Buttons and hovers: a touch of ink over the lit panes
        const ink = preset.scheme === 'dark' ? WHITE : BLACK;
        const raised = [...bare, ...lighted].map(pane =>
          mixRgb(pane, ink, SCHEMES[preset.scheme].raised[1]),
        );
        const hover = color(preset.tokens['surface-3']);
        const body = Math.min(
          target,
          4.5,
          0.9 * contrastRatio(color(preset.tokens[token]), hover),
        );
        expect(minContrast(color(tokens[token]), raised)).toBeGreaterThan(body);
      }
    },
  );
});
