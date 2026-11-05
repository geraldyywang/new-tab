/**
 * The background photo as theming sees it: a few colours that sum it up and
 * the dim over it. The background feature publishes it here and caches the
 * saved one in `localStorage`; the appearance feature reads it to tint the
 * surfaces without importing the background feature.
 */
import {useSyncExternalStore} from 'react';
import {parsePhotoPalette, type PhotoPalette} from './photoPalette';

/** The background photo, as far as theming is concerned. */
export interface PhotoBackdrop {
  palette: PhotoPalette;
  /** Strength of the dim overlay, 0 to 1. */
  dim: number;
  /** Card opacity chosen by the user, 0 to 1; unset or `null` is Auto. */
  paneOpacity?: number | null;
}

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
  /** False until the photo and its display options have been read. */
  loaded: boolean;
  /** `null` without a photo. */
  backdrop: PhotoBackdrop | null;
}

const UNLOADED: PhotoBackdropState = {loaded: false, backdrop: null};
let published = UNLOADED;
const listeners = new Set<() => void>();

/** Makes `state` the current backdrop for every reader. */
export function publishPhotoBackdrop(state: PhotoBackdropState): void {
  if (state === published) return;
  published = state;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current photo backdrop, as last published. */
export function usePhotoBackdrop(): PhotoBackdropState {
  return useSyncExternalStore(subscribe, () => published);
}
