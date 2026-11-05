import {describe, expect, it} from 'vitest';
import {
  contrastRatio,
  minContrast,
  mixRgb,
  parseColor,
  relativeLuminance,
  toHex,
  toHexAlpha,
  towardsContrast,
  type Rgb,
} from './color';

function color(text: string): Rgb {
  const parsed = parseColor(text);
  if (!parsed) throw new Error(`Unparseable colour ${text}`);
  return parsed;
}

describe('parseColor', () => {
  it('parses hex colours', () => {
    expect(color('#ff8000')).toEqual({r: 1, g: 128 / 255, b: 0});
    expect(color('#FFFFFF')).toEqual({r: 1, g: 1, b: 1});
  });

  it('converts OKLCH to sRGB', () => {
    // Tailwind's palette values and their published hex equivalents
    expect(toHex(color('oklch(20.5% 0 none)'))).toBe('#171717');
    expect(toHex(color('oklch(55.6% 0 none)'))).toBe('#737373');
    expect(toHex(color('oklch(70.4% 0.191 22.216)'))).toBe('#ff6467');
    expect(toHex(color('oklch(76.5% 0.177 163.223)'))).toBe('#00d492');
    expect(toHex(color('oklch(1 0 0)'))).toBe('#ffffff');
  });

  it('rejects anything else', () => {
    expect(parseColor('red')).toBeNull();
    expect(parseColor('#fff')).toBeNull();
    expect(parseColor('var(--color-neutral-900)')).toBeNull();
  });
});

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(relativeLuminance(color('#ffffff'))).toBeCloseTo(1);
    expect(contrastRatio(color('#000000'), color('#ffffff'))).toBeCloseTo(21);
    expect(contrastRatio(color('#ffffff'), color('#777777'))).toBeCloseTo(
      4.48,
      2,
    );
  });

  it('is symmetric', () => {
    const a = color('#2e3440');
    const b = color('#88c0d0');
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });
});

describe('mixRgb', () => {
  it('interpolates channels', () => {
    expect(toHex(mixRgb(color('#000000'), color('#ffffff'), 0.5))).toBe(
      '#808080',
    );
    expect(mixRgb(color('#123456'), color('#ffffff'), 0)).toEqual(
      color('#123456'),
    );
  });
});

describe('toHexAlpha', () => {
  it('appends the alpha as a hex pair', () => {
    expect(toHexAlpha(color('#336699'), 0.5)).toBe('#33669980');
    expect(toHexAlpha(color('#000000'), 1)).toBe('#000000ff');
  });
});

describe('minContrast', () => {
  it('is the contrast against the closest background', () => {
    const white = color('#ffffff');
    expect(minContrast(white, [color('#000000'), white])).toBeCloseTo(1);
  });
});

describe('towardsContrast', () => {
  const white = color('#ffffff');
  const dark = [color('#202020')];

  it('leaves a colour that already reaches the ratio', () => {
    expect(towardsContrast(color('#a0c0ff'), dark, white, 3)).toEqual({
      color: color('#a0c0ff'),
      amount: 0,
    });
  });

  it('moves a colour just far enough', () => {
    const {color: adjusted, amount} = towardsContrast(
      color('#404040'),
      dark,
      white,
      4.5,
    );
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThan(1);
    expect(minContrast(adjusted, dark)).toBeGreaterThanOrEqual(4.5);
  });

  it('ends at the target when nothing reaches the ratio', () => {
    expect(towardsContrast(color('#404040'), dark, white, 30)).toEqual({
      color: white,
      amount: 1,
    });
  });
});
