/**
 * Key/value backends for the settings store: `chrome.storage.sync` when
 * running as an extension (synced through the user's Google account), or
 * `localStorage` when running on the Vite dev server.
 */

export const SETTING_KEYS = [
  'weatherApiKey',
  'sidebarLinks',
  'socialLinks',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export type StorageBackendKind = 'chrome-sync' | 'local-storage';

export type RawSettings = Partial<Record<SettingKey, unknown>>;

export interface StorageBackend {
  kind: StorageBackendKind;
  get(): Promise<RawSettings>;
  set(key: SettingKey, value: unknown): Promise<void>;
  remove(key: SettingKey): Promise<void>;
  /** Calls `onChange` when a setting changes elsewhere; returns unsubscribe. */
  subscribe(onChange: () => void): () => void;
}

export function hasChromeSync(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync);
}

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

export const LOCAL_STORAGE_PREFIX = 'new-tab:';

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

export function createBackend(): StorageBackend {
  return hasChromeSync() ? chromeSyncBackend() : localStorageBackend();
}
