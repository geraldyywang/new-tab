/**
 * Key/value backends for the settings store: `chrome.storage.sync` when
 * running as an extension (synced through the user's Google account), or
 * `localStorage` when running on the Vite dev server.
 */

/** Every key the settings store reads and writes. */
export const SETTING_KEYS = [
  'weatherApiKey',
  'sidebarLinks',
  'socialLinks',
] as const;
/** A key in `SETTING_KEYS`. */
export type SettingKey = (typeof SETTING_KEYS)[number];

/** Which storage a backend uses. */
export type StorageBackendKind = 'chrome-sync' | 'local-storage';

/** Settings as read from storage, not yet validated. */
export type RawSettings = Partial<Record<SettingKey, unknown>>;

/** Async key/value access to one settings storage area. */
export interface StorageBackend {
  kind: StorageBackendKind;
  get(): Promise<RawSettings>;
  set(key: SettingKey, value: unknown): Promise<void>;
  remove(key: SettingKey): Promise<void>;
  /** Calls `onChange` when a setting changes elsewhere; returns unsubscribe. */
  subscribe(onChange: () => void): () => void;
}

/**
 * Whether `chrome.storage.sync` exists, i.e. we are running as an extension.
 */
export function hasChromeSync(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync);
}

/** Backend over `chrome.storage.sync`. */
export function chromeSyncBackend(): StorageBackend {
  return {
    kind: 'chrome-sync',
    get: () => chrome.storage.sync.get<RawSettings>([...SETTING_KEYS]),
    set: (key, value) => chrome.storage.sync.set({[key]: value}),
    remove: key => chrome.storage.sync.remove(key),
    subscribe: onChange => {
      function listener(
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName,
      ) {
        if (areaName === 'sync' && SETTING_KEYS.some(key => key in changes)) {
          onChange();
        }
      }
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    },
  };
}

/** Prefix for this app's `localStorage` keys. */
export const LOCAL_STORAGE_PREFIX = 'new-tab:';

/** Backend over `localStorage`, for the Vite dev server. */
export function localStorageBackend(): StorageBackend {
  return {
    kind: 'local-storage',
    get: async () => {
      const result: RawSettings = {};
      for (const key of SETTING_KEYS) {
        try {
          const raw = window.localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
          if (raw !== null) result[key] = JSON.parse(raw);
        } catch (err) {
          // Corrupt JSON or storage blocked: treat the item as missing
          console.warn(`Ignoring unreadable setting "${key}"`, err);
        }
      }
      return result;
    },
    set: async (key, value) => {
      window.localStorage.setItem(
        LOCAL_STORAGE_PREFIX + key,
        JSON.stringify(value),
      );
    },
    remove: async key => {
      window.localStorage.removeItem(LOCAL_STORAGE_PREFIX + key);
    },
    subscribe: onChange => {
      // Only fired for changes made in *other* tabs on the same origin
      function listener(event: StorageEvent) {
        if (event.key === null || event.key.startsWith(LOCAL_STORAGE_PREFIX)) {
          onChange();
        }
      }
      window.addEventListener('storage', listener);
      return () => window.removeEventListener('storage', listener);
    },
  };
}

/**
 * The `chrome.storage.sync` backend when available, otherwise `localStorage`.
 */
export function createBackend(): StorageBackend {
  return hasChromeSync() ? chromeSyncBackend() : localStorageBackend();
}
