import {describe, expect, it} from 'vitest';
import {extractPalette, type Pixels} from './photoPalette';

/** A `width` x `height` image coloured by `colorAt` (RGB 0-255). */
function image(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number],
): Pixels {
  const data: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.push(...colorAt(x, y), 255);
  }
  return {width, height, data};
}

describe('extractPalette', () => {
  it('describes a flat photo with its one colour', () => {
    expect(extractPalette(image(4, 4, () => [51, 102, 153]))).toEqual({
      average: '#336699',
      darkest: '#336699',
      lightest: '#336699',
      vivid: '#336699',
    });
  });

  it('finds the darkest and lightest regions and the mean', () => {
    // Left half black, right half white
    const palette = extractPalette(
      image(8, 4, x => (x < 4 ? [0, 0, 0] : [255, 255, 255])),
    );
    expect(palette.darkest).toBe('#000000');
    expect(palette.lightest).toBe('#ffffff');
    expect(palette.average).toBe('#808080');
  });

  it('averages regions, so a single bright pixel is not the lightest', () => {
    const palette = extractPalette(
      image(4, 4, (x, y) => (x === 0 && y === 0 ? [255, 255, 255] : [0, 0, 0])),
    );
    expect(palette.lightest).toBe('#404040');
  });

  it('picks the most colourful pixel as the vivid colour', () => {
    const palette = extractPalette(
      image(6, 2, x => (x === 5 ? [230, 40, 90] : [120, 120, 130])),
    );
    expect(palette.vivid).toBe('#e6285a');
  });

  it('copes with odd sizes', () => {
    const palette = extractPalette(image(3, 3, () => [10, 20, 30]));
    expect(palette.darkest).toBe('#0a141e');
  });
});
