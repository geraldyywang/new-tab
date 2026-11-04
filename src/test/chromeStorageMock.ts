import {vi} from 'vitest';

type ChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: chrome.storage.AreaName,
) => void;

/** Per-item size limit the mock enforces, like `chrome.storage.sync`. */
export const MOCK_QUOTA_BYTES_PER_ITEM = 8192;

/** Test handle returned by `installChromeStorageMock`. */
export interface ChromeStorageMock {
  /** Raw contents of the in-memory sync area. */
  data: Map<string, unknown>;
  /** Simulates a write from another tab/device: updates data, fires onChanged. */
  externalSet(items: Record<string, unknown>): void;
  externalRemove(key: string): void;
  /** Makes the next set()/remove() reject with this message. */
  failNextWrite(message: string): void;
  /** While true, get() results wait in `pendingGets` until called. */
  deferGets: boolean;
  pendingGets: Array<() => void>;
  /** Number of registered onChanged listeners. */
  listenerCount(): number;
}

function toList(keys: string | string[] | null | undefined, all: string[]) {
  return keys == null ? all : Array.isArray(keys) ? keys : [keys];
}

// chrome.storage serialises values, so hand out copies like the real API
function copy<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Installs an in-memory `chrome.storage.sync` on globalThis (removed again by
 * vitest's `unstubGlobals`). onChanged fires asynchronously, as in Chrome.
 */
export function installChromeStorageMock(): ChromeStorageMock {
  const data = new Map<string, unknown>();
  const listeners = new Set<ChangeListener>();
  let nextWriteError: string | null = null;

  function emit(changes: Record<string, chrome.storage.StorageChange>) {
    setTimeout(() => listeners.forEach(l => l(changes, 'sync')), 0);
  }

  function applySet(items: Record<string, unknown>) {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = {oldValue: data.get(key), newValue: copy(value)};
      data.set(key, copy(value));
    }
    emit(changes);
  }

  function applyRemove(keys: string[]) {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const key of keys) {
      if (!data.has(key)) continue;
      changes[key] = {oldValue: data.get(key)};
      data.delete(key);
    }
    if (Object.keys(changes).length > 0) emit(changes);
  }

  function throwPendingError() {
    if (nextWriteError === null) return;
    const message = nextWriteError;
    nextWriteError = null;
    throw new Error(message);
  }

  const mock: ChromeStorageMock = {
    data,
    externalSet: applySet,
    externalRemove: key => applyRemove([key]),
    failNextWrite: message => {
      nextWriteError = message;
    },
    deferGets: false,
    pendingGets: [],
    listenerCount: () => listeners.size,
  };

  const sync = {
    QUOTA_BYTES_PER_ITEM: MOCK_QUOTA_BYTES_PER_ITEM,
    get: (keys?: string | string[] | null) => {
      // Values are captured when get() is called, not when it resolves
      const result: Record<string, unknown> = {};
      for (const key of toList(keys, [...data.keys()])) {
        if (data.has(key)) result[key] = copy(data.get(key));
      }
      if (!mock.deferGets) return Promise.resolve(result);
      return new Promise(resolve => {
        mock.pendingGets.push(() => resolve(result));
      });
    },
    set: async (items: Record<string, unknown>) => {
      throwPendingError();
      for (const [key, value] of Object.entries(items)) {
        const bytes = key.length + JSON.stringify(value).length;
        if (bytes > MOCK_QUOTA_BYTES_PER_ITEM) {
          throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
        }
      }
      applySet(items);
    },
    remove: async (keys: string | string[]) => {
      throwPendingError();
      applyRemove(toList(keys, []));
    },
  };

  vi.stubGlobal('chrome', {
    runtime: {},
    storage: {
      sync,
      onChanged: {
        addListener: (l: ChangeListener) => listeners.add(l),
        removeListener: (l: ChangeListener) => listeners.delete(l),
      },
    },
  });

  return mock;
}
