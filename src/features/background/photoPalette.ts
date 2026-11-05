/**
 * A few colours that sum up the background photo, so the page can tint its
 * cards with the photo and keep their text readable over it. Computed once,
 * from a tiny downscaled copy, when the photo is processed, and stored with
 * it.
 */
import {relativeLuminance, toHex, type Rgb} from '../../theme/color';
import type {PhotoPalette} from '../../theme/photoPalette';
import type {Size} from './imageProcessing';
/** RGBA pixels, row by row, like `ImageData`. */
export interface Pixels {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

/** Size of the downscaled copy a palette is computed from. */
export const PALETTE_SAMPLE_SIZE: Size = {width: 32, height: 18};

/**
 * Side of the square regions compared for `darkest` and `lightest`, in
 * sample pixels: about 1/9 of the page height, roughly what a card covers.
 */
const REGION = 2;

function mean(colors: readonly Rgb[]): Rgb {
  const sum = {r: 0, g: 0, b: 0};
  for (const {r, g, b} of colors) {
    sum.r += r;
    sum.g += g;
    sum.b += b;
  }
  const n = Math.max(1, colors.length);
  return {r: sum.r / n, g: sum.g / n, b: sum.b / n};
}

/** sRGB chroma: how far a colour is from grey. */
function chroma({r, g, b}: Rgb) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** The palette of a (downscaled) photo; transparency is ignored. */
export function extractPalette({width, height, data}: Pixels): PhotoPalette {
  function pixel(x: number, y: number): Rgb {
    const i = (y * width + x) * 4;
    return {r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255};
  }
  const pixels: Rgb[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixels.push(pixel(x, y));
  }

  const regions: Rgb[] = [];
  for (let y = 0; y < height; y += REGION) {
    for (let x = 0; x < width; x += REGION) {
      const block: Rgb[] = [];
      for (let dy = 0; dy < REGION && y + dy < height; dy++) {
        for (let dx = 0; dx < REGION && x + dx < width; dx++) {
          block.push(pixel(x + dx, y + dy));
        }
      }
      regions.push(mean(block));
    }
  }
  const byLuminance = regions
    .map(color => ({color, luminance: relativeLuminance(color)}))
    .sort((a, b) => a.luminance - b.luminance);
  const vivid = pixels.reduce(
    (best, color) => (chroma(color) > chroma(best) ? color : best),
    pixels[0] ?? {r: 0, g: 0, b: 0},
  );

  return {
    average: toHex(mean(pixels)),
    darkest: toHex(byLuminance[0]?.color ?? mean(pixels)),
    lightest: toHex(byLuminance[byLuminance.length - 1]?.color ?? mean(pixels)),
    vivid: toHex(vivid),
  };
}
