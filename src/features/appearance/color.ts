/**
 * Small colour maths for theme checks: parses `#rrggbb` and OKLCH colours,
 * converts them to sRGB and computes WCAG 2 contrast ratios. Enough for the
 * preset contrast test and for keeping custom accents visible, without a
 * colour library.
 */

/** A colour as gamma-encoded sRGB channels in [0, 1]. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_PATTERN = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i;
const OKLCH_PATTERN =
  /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+|none)\s+([\d.]+|none)\s*\)$/i;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function encodeGamma(linear: number) {
  return linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}

function decodeGamma(encoded: number) {
  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

/**
 * OKLCH to sRGB (Björn Ottosson's OKLab matrices). Out-of-gamut channels are
 * clamped, which is how browsers show them on an sRGB screen.
 */
export function oklchToRgb(
  lightness: number,
  chroma: number,
  hueDegrees: number,
): Rgb {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: clamp01(
      encodeGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    ),
    g: clamp01(
      encodeGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    ),
    b: clamp01(
      encodeGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ),
  };
}

/** Parses `#rrggbb` or an OKLCH colour as written in CSS; `null` otherwise. */
export function parseColor(text: string): Rgb | null {
  const hex = HEX_PATTERN.exec(text.trim());
  if (hex) {
    const [r, g, b] = hex.slice(1).map(pair => parseInt(pair, 16) / 255);
    return {r, g, b};
  }
  const oklch = OKLCH_PATTERN.exec(text.trim());
  if (!oklch) return null;
  const [, lightness, percent, chroma, hue] = oklch;
  return oklchToRgb(
    Number(lightness) / (percent ? 100 : 1),
    numberOrZero(chroma),
    numberOrZero(hue),
  );
}

// CSS `none` means a missing component, which computes as zero
function numberOrZero(value: string) {
  return value === 'none' ? 0 : Number(value);
}

/** `#rrggbb` for a colour. */
export function toHex({r, g, b}: Rgb): string {
  return `#${[r, g, b].map(hexPair).join('')}`;
}

function hexPair(channel: number) {
  return Math.round(clamp01(channel) * 255)
    .toString(16)
    .padStart(2, '0');
}

/** Mixes `from` towards `to` by `amount` (0 to 1), in sRGB like CSS does. */
export function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  };
}

/** WCAG 2 relative luminance. */
export function relativeLuminance({r, g, b}: Rgb): number {
  return (
    0.2126 * decodeGamma(r) + 0.7152 * decodeGamma(g) + 0.0722 * decodeGamma(b)
  );
}

/** WCAG 2 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}
