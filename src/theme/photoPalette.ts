/**
 * The few colours that sum up a background photo. The background feature
 * computes them (features/background/photoPalette.ts) and stores them with
 * the photo; theming tints the surfaces with them.
 */

/** Colours of the photo, as `#rrggbb`. */
export interface PhotoPalette {
  /** Mean colour of the whole photo. */
  average: string;
  /** Mean colour of its darkest region (about what a card covers). */
  darkest: string;
  /** Mean colour of its lightest region. */
  lightest: string;
  /** Its most colourful pixel: the accent candidate. */
  vivid: string;
}

const PALETTE_KEYS: ReadonlyArray<keyof PhotoPalette> = [
  'average',
  'darkest',
  'lightest',
  'vivid',
];

/** Validates a stored palette; `null` unless every colour is `#rrggbb`. */
export function parsePhotoPalette(data: unknown): PhotoPalette | null {
  if (typeof data !== 'object' || data === null) return null;
  const record: Partial<Record<keyof PhotoPalette, unknown>> = data;
  const palette: Partial<PhotoPalette> = {};
  for (const key of PALETTE_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) {
      return null;
    }
    palette[key] = value;
  }
  return palette as PhotoPalette; // every key was set above
}
