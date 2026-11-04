import {defineSettingsSlice} from '../../settings/slices';

/** How the photo fills the page: cropped to fill, or letterboxed. */
export type BackgroundFit = 'cover' | 'contain';

/**
 * How the background photo is shown. Synced, so another computer without
 * the photo keeps these and shows the theme backdrop until one is added.
 */
export interface BackgroundDisplay {
  fit: BackgroundFit;
  /** Focal point (the part kept in view when cropping), in % from the left. */
  focusX: number;
  /** Focal point, in % from the top. */
  focusY: number;
  /** Darkening overlay, 0 to `MAX_DIM` %. */
  dim: number;
  /** Blur radius, 0 to `MAX_BLUR` px. */
  blur: number;
}

/** Strongest dim overlay, in %. */
export const MAX_DIM = 80;
/** Strongest blur, in px. */
export const MAX_BLUR = 20;

/** Display options before the user changes anything. */
export const DEFAULT_BACKGROUND_DISPLAY: BackgroundDisplay = Object.freeze({
  fit: 'cover',
  focusX: 50,
  focusY: 50,
  dim: 20,
  blur: 0,
});

function inRange(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(0, Math.round(value)));
}

/** Validates stored display options, clamping numbers into range. */
export function parseBackgroundDisplay(
  data: unknown,
): BackgroundDisplay | null {
  if (typeof data !== 'object' || data === null) return null;
  const record: Partial<Record<keyof BackgroundDisplay, unknown>> = data;
  const {fit} = record;
  const focusX = inRange(record.focusX, 100);
  const focusY = inRange(record.focusY, 100);
  const dim = inRange(record.dim, MAX_DIM);
  const blur = inRange(record.blur, MAX_BLUR);
  if (fit !== 'cover' && fit !== 'contain') return null;
  if (focusX === null || focusY === null || dim === null || blur === null) {
    return null;
  }
  return {fit, focusX, focusY, dim, blur};
}

/** Whether two sets of display options look the same. */
export function displayEquals(a: BackgroundDisplay, b: BackgroundDisplay) {
  return (
    a.fit === b.fit &&
    a.focusX === b.focusX &&
    a.focusY === b.focusY &&
    a.dim === b.dim &&
    a.blur === b.blur
  );
}

/** Fit, focal point, dim and blur for the background photo. */
export const backgroundDisplaySlice = defineSettingsSlice<BackgroundDisplay>({
  key: 'background.display',
  area: 'sync',
  parse: parseBackgroundDisplay,
  default: DEFAULT_BACKGROUND_DISPLAY,
});
