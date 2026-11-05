/**
 * The background photo as theming needs it: its palette and the dim
 * strength. The saved state is cached in `localStorage`, so the next page
 * load can tint the cards before IndexedDB answers.
 */
import {useEffect, useMemo} from 'react';
import type {PhotoBackdrop} from '../appearance/photoTokens';
import {useSlice} from '../../settings/slices';
import {BACKGROUND_IMAGE, useBackgroundImage} from './backgroundImage';
import {useBackgroundDisplay} from './displayPreview';
import {parsePhotoPalette} from '../../theme/photoPalette';
import {backgroundDisplaySlice, type BackgroundDisplay} from './settings';

/** `localStorage` key of the saved photo backdrop, read before render. */
export const PHOTO_CACHE_KEY = 'new-tab-cache:background.photo';

/** Remembers the backdrop (`null`: no photo) for the next page load. */
export function writePhotoCache(
  backdrop: PhotoBackdrop | null,
  storage?: Storage,
) {
  try {
    const target = storage ?? window.localStorage;
    if (backdrop) target.setItem(PHOTO_CACHE_KEY, JSON.stringify(backdrop));
    else target.removeItem(PHOTO_CACHE_KEY);
  } catch {
    // Storage blocked or full: the next load tints the cards a little later
  }
}

function isFraction(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

/** Dim and pane opacity of `display` as fractions, as theming takes them. */
function fractions({dim, paneOpacity}: BackgroundDisplay) {
  return {
    dim: dim / 100,
    paneOpacity: paneOpacity === null ? null : paneOpacity / 100,
  };
}

/** The cached backdrop; `null` without a usable one. */
export function readPhotoCache(storage?: Storage): PhotoBackdrop | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(PHOTO_CACHE_KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const {palette, dim, paneOpacity} = data as Partial<
      Record<keyof PhotoBackdrop, unknown>
    >;
    const parsed = parsePhotoPalette(palette);
    if (!parsed || !isFraction(dim)) return null;
    if (paneOpacity != null && !isFraction(paneOpacity)) return null;
    return {palette: parsed, dim, paneOpacity: paneOpacity ?? null};
  } catch {
    return null;
  }
}

/** The photo backdrop to theme with, and whether its sources have loaded. */
export interface PhotoBackdropState {
  /** False until both the photo store and the display options answer. */
  loaded: boolean;
  /** `null` without a photo. */
  backdrop: PhotoBackdrop | null;
}

/**
 * The current photo backdrop, with the dim and pane opacity of the display
 * options being edited, if any; caches the saved one.
 */
export function usePhotoBackdrop(store = BACKGROUND_IMAGE): PhotoBackdropState {
  const {loaded: imageLoaded, palette} = useBackgroundImage(store);
  const saved = useSlice(backgroundDisplaySlice);
  const {dim, paneOpacity} = fractions(useBackgroundDisplay());
  const loaded = imageLoaded && saved.loaded;
  const savedDisplay = fractions(saved.value);
  const [savedDim, savedOpacity] = [savedDisplay.dim, savedDisplay.paneOpacity];

  useEffect(() => {
    if (!loaded) return;
    const dim = savedDim;
    writePhotoCache(palette ? {palette, dim, paneOpacity: savedOpacity} : null);
  }, [loaded, palette, savedDim, savedOpacity]);

  const backdrop = useMemo(
    () => (palette ? {palette, dim, paneOpacity} : null),
    [palette, dim, paneOpacity],
  );
  return {loaded, backdrop};
}
