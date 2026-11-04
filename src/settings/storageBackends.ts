/**
 * Key/value backends for the settings store: `chrome.storage.sync` (synced
 * through the user's Google account) or `chrome.storage.local` (this device
 * only) when running as an extension, or `localStorage` when running on the
 * Vite dev server.
 */

/** Where a setting lives: synced across the user's devices, or this device. */
export type StorageArea = 'sync' | 'local';

/** Which storage a backend uses. */
export type StorageBackendKind =
  'chrome-sync' | 'chrome-local' | 'local-storage';

/** Items as read from storage, not yet validated. */
export type RawItems = Record<string, unknown>;

/** Async key/value access to one settings storage area. */
export interface StorageBackend {
  readonly kind: StorageBackendKind;
  readonly area: StorageArea;
  /** Reads the given keys; missing keys are left out of the result. */
  get(keys: readonly string[]): Promise<RawItems>;
  set(items: RawItems): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
  /**
   * Calls `onChange` with the changed keys when items change (`null` when
   * unknown, e.g. storage was cleared); returns unsubscribe.
   */
  subscribe(onChange: (keys: readonly string[] | null) => void): () => void;
}

/** Whether `chrome.storage[area]` exists, i.e. we are running as an extension. */
export function hasChromeStorage(area: StorageArea): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.[area]);
}

/** Backend over `chrome.storage.sync` or `chrome.storage.local`. */
export function chromeBackend(area: StorageArea): StorageBackend {
  const storage: chrome.storage.StorageArea = chrome.storage[area];
  return {
    kind: area === 'sync' ? 'chrome-sync' : 'chrome-local',
    area,
    get: keys => storage.get<RawItems>([...keys]),
    set: items => storage.set(items),
    remove: keys => storage.remove([...keys]),
    subscribe: onChange => {
      function listener(
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: chrome.storage.AreaName,
      ) {
        if (areaName === area) onChange(Object.keys(changes));
      }
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    },
  };
}

/** Prefix for this app's `localStorage` keys, per area. */
export const LOCAL_STORAGE_PREFIX: Readonly<Record<StorageArea, string>> = {
  sync: 'new-tab:',
  local: 'new-tab-local:',
};

/** Backend over `localStorage`, for the Vite dev server. */
export function localStorageBackend(area: StorageArea): StorageBackend {
  const prefix = LOCAL_STORAGE_PREFIX[area];
  return {
    kind: 'local-storage',
    area,
    get: async keys => {
      const result: RawItems = {};
      for (const key of keys) {
        try {
          const raw = window.localStorage.getItem(prefix + key);
          if (raw !== null) result[key] = JSON.parse(raw);
        } catch (err) {
          // Corrupt JSON or storage blocked: treat the item as missing
          console.warn(`Ignoring unreadable setting "${key}"`, err);
        }
      }
      return result;
    },
    set: async items => {
      for (const [key, value] of Object.entries(items)) {
        window.localStorage.setItem(prefix + key, JSON.stringify(value));
      }
    },
    remove: async keys => {
      for (const key of keys) window.localStorage.removeItem(prefix + key);
    },
    subscribe: onChange => {
      // Only fired for changes made in *other* tabs on the same origin
      function listener(event: StorageEvent) {
        if (event.key === null) onChange(null);
        else if (event.key.startsWith(prefix)) {
          onChange([event.key.slice(prefix.length)]);
        }
      }
      window.addEventListener('storage', listener);
      return () => window.removeEventListener('storage', listener);
    },
  };
}

/** The `chrome.storage` backend for `area` when available, else localStorage. */
export function createBackend(area: StorageArea): StorageBackend {
  return hasChromeStorage(area)
    ? chromeBackend(area)
    : localStorageBackend(area);
}
