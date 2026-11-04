import {useSyncExternalStore} from 'react';
import {
  DEFAULT_SIDEBAR_LINKS,
  DEFAULT_SOCIAL_LINKS,
  sanitizeLinks,
  type StoredLink,
} from '../features/links/links';
import {
  createBackend,
  type RawSettings,
  type SettingKey,
  type StorageBackendKind,
} from './storageBackends';

export type {StorageBackendKind} from './storageBackends';

/** Settings keys that hold a link list. */
export type LinkListKey = Extract<SettingKey, 'sidebarLinks' | 'socialLinks'>;

/** Current settings, validated, with defaults filled in. */
export interface SettingsSnapshot {
  /** False until the first read from storage has finished. */
  loaded: boolean;
  backend: StorageBackendKind;
  weatherApiKey: string;
  sidebarLinks: readonly StoredLink[];
  socialLinks: readonly StoredLink[];
}

/** A write was rejected (quota exceeded, storage unavailable, ...). */
export class SettingsWriteError extends Error {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'SettingsWriteError';
  }
}

/**
 * `chrome.storage.sync.QUOTA_BYTES_PER_ITEM`, also enforced in dev so behaviour
 * matches the extension. Each setting is its own item to stay under it.
 */
export const QUOTA_BYTES_PER_ITEM = 8192;

const backend = createBackend();

function parseSettings(raw: RawSettings): SettingsSnapshot {
  return {
    loaded: true,
    backend: backend.kind,
    weatherApiKey:
      typeof raw.weatherApiKey === 'string' ? raw.weatherApiKey.trim() : '',
    sidebarLinks: sanitizeLinks(raw.sidebarLinks) ?? DEFAULT_SIDEBAR_LINKS,
    socialLinks: sanitizeLinks(raw.socialLinks) ?? DEFAULT_SOCIAL_LINKS,
  };
}

// --- External store for useSyncExternalStore -------------------------------

let snapshot: SettingsSnapshot = {
  loaded: false,
  backend: backend.kind,
  weatherApiKey: '',
  sidebarLinks: DEFAULT_SIDEBAR_LINKS,
  socialLinks: DEFAULT_SOCIAL_LINKS,
};
const listeners = new Set<() => void>();
let unsubscribeBackend: (() => void) | null = null;
let readSeq = 0;

async function refresh() {
  const seq = ++readSeq;
  let raw: RawSettings = {};
  try {
    raw = await backend.get();
  } catch (err) {
    console.error('Could not read settings', err);
  }
  // A newer read started while this one was in flight; let it win
  if (seq !== readSeq) return;
  snapshot = parseSettings(raw);
  listeners.forEach(listener => listener());
}

/**
 * `useSyncExternalStore` subscribe: the first listener starts watching the
 * backend and the last one to leave stops it.
 */
export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  if (!unsubscribeBackend) {
    unsubscribeBackend = backend.subscribe(() => void refresh());
    void refresh();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribeBackend) {
      unsubscribeBackend();
      unsubscribeBackend = null;
    }
  };
}

/** `useSyncExternalStore` snapshot: the latest settings. */
export function getSettingsSnapshot() {
  return snapshot;
}

// --- Writes ----------------------------------------------------------------

/** A user-facing message for a failed storage write. */
export function describeWriteError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('QUOTA_BYTES_PER_ITEM')) {
    return "That's too much data for one setting (Chrome sync allows 8 KB). Remove some links and try again.";
  }
  if (message.includes('QUOTA_BYTES')) {
    return 'Chrome sync storage is full for this extension.';
  }
  if (message.includes('MAX_WRITE_OPERATIONS')) {
    return 'Too many saves in a short time. Wait a minute and try again.';
  }
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return "This browser's storage is full.";
  }
  return `Could not save settings: ${message}`;
}

/** Writes one item; `undefined` removes it. */
async function writeSetting(key: SettingKey, value: unknown) {
  if (value !== undefined) {
    const bytes = new TextEncoder().encode(key + JSON.stringify(value)).length;
    if (bytes > QUOTA_BYTES_PER_ITEM) {
      throw new SettingsWriteError(
        `That's too much data for one setting (${bytes} of ${QUOTA_BYTES_PER_ITEM} bytes). Remove some links and try again.`,
      );
    }
  }
  try {
    if (value === undefined) await backend.remove(key);
    else await backend.set(key, value);
  } catch (err) {
    throw new SettingsWriteError(describeWriteError(err), {cause: err});
  }
  await refresh();
}

/** Saves the WeatherAPI key; an empty string removes it. */
export function saveWeatherApiKey(key: string) {
  return writeSetting('weatherApiKey', key.trim() || undefined);
}

/** Saves a link list; `null` removes it so the defaults are used. */
export function saveLinks(which: LinkListKey, links: StoredLink[] | null) {
  return writeSetting(which, links ?? undefined);
}

/**
 * Current settings; re-renders when they change here or on another tab or
 * device.
 */
export function useSettings(): SettingsSnapshot {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot);
}
