import {vi} from 'vitest';

type ChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: chrome.storage.AreaName,
) => void;

type MockArea = 'sync' | 'local';

/** Per-item size limit the mock enforces on sync, like `chrome.storage.sync`. */
export const MOCK_QUOTA_BYTES_PER_ITEM = 8192;

/** Test handle returned by `installChromeStorageMock`. */
export interface ChromeStorageMock {
  /** Raw contents of the in-memory sync area. */
  data: Map<string, unknown>;
  /** Raw contents of the in-memory local area. */
  localData: Map<string, unknown>;
  /** Simulates a write from another tab/device: updates data, fires onChanged. */
  externalSet(items: Record<string, unknown>, area?: MockArea): void;
  externalRemove(key: string, area?: MockArea): void;
  /** Makes the next set()/remove() (either area) reject with this message. */
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
 * Installs an in-memory `chrome.storage.sync` and `chrome.storage.local` on
 * globalThis (removed again by vitest's `unstubGlobals`). onChanged fires
 * asynchronously, as in Chrome.
 */
export function installChromeStorageMock(): ChromeStorageMock {
  const stores: Record<MockArea, Map<string, unknown>> = {
    sync: new Map(),
    local: new Map(),
  };
  const listeners = new Set<ChangeListener>();
  let nextWriteError: string | null = null;

  function emit(
    changes: Record<string, chrome.storage.StorageChange>,
    area: MockArea,
  ) {
    setTimeout(() => listeners.forEach(l => l(changes, area)), 0);
  }

  function applySet(items: Record<string, unknown>, area: MockArea = 'sync') {
    const data = stores[area];
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = {oldValue: data.get(key), newValue: copy(value)};
      data.set(key, copy(value));
    }
    emit(changes, area);
  }

  function applyRemove(keys: string[], area: MockArea = 'sync') {
    const data = stores[area];
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const key of keys) {
      if (!data.has(key)) continue;
      changes[key] = {oldValue: data.get(key)};
      data.delete(key);
    }
    if (Object.keys(changes).length > 0) emit(changes, area);
  }

  function throwPendingError() {
    if (nextWriteError === null) return;
    const message = nextWriteError;
    nextWriteError = null;
    throw new Error(message);
  }

  const mock: ChromeStorageMock = {
    data: stores.sync,
    localData: stores.local,
    externalSet: applySet,
    externalRemove: (key, area) => applyRemove([key], area),
    failNextWrite: message => {
      nextWriteError = message;
    },
    deferGets: false,
    pendingGets: [],
    listenerCount: () => listeners.size,
  };

  function makeArea(area: MockArea) {
    const data = stores[area];
    return {
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
        if (area === 'sync') {
          for (const [key, value] of Object.entries(items)) {
            const bytes = key.length + JSON.stringify(value).length;
            if (bytes > MOCK_QUOTA_BYTES_PER_ITEM) {
              throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
            }
          }
        }
        applySet(items, area);
      },
      remove: async (keys: string | string[]) => {
        throwPendingError();
        applyRemove(toList(keys, []), area);
      },
    };
  }

  vi.stubGlobal('chrome', {
    runtime: {},
    storage: {
      sync: {
        QUOTA_BYTES_PER_ITEM: MOCK_QUOTA_BYTES_PER_ITEM,
        ...makeArea('sync'),
      },
      local: makeArea('local'),
      onChanged: {
        addListener: (l: ChangeListener) => listeners.add(l),
        removeListener: (l: ChangeListener) => listeners.delete(l),
      },
    },
  });

  return mock;
}
