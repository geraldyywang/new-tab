/**
 * Settings slices: each feature defines the settings it owns with
 * `defineSettingsSlice`, reads them with `useSlice` and writes them with
 * `saveSlice` / `resetSlice`. See docs/storage.md.
 */
import {useSyncExternalStore} from 'react';
import {
  isChunkedKey,
  readChunked,
  removeChunked,
  writeChunked,
} from './chunkedStorage';
import {registerSlice} from './sliceRegistry';
import {
  createBackend,
  type StorageArea,
  type StorageBackend,
  type StorageBackendKind,
} from './storageBackends';
import {
  checkItemSize,
  describeWriteError,
  SettingsWriteError,
} from './writeErrors';

export {SettingsWriteError} from './writeErrors';

/** What `defineSettingsSlice` needs to know about a slice. */
export interface SettingsSliceOptions<T> {
  /** Storage key; unique within the area. No `:` (reserved for chunks). */
  key: string;
  /** `sync` follows the user's Google account; `local` stays on this device. */
  area: StorageArea;
  /**
   * Validates a value read from storage (untrusted: corrupt, or written by
   * another version). Returns `null` to fall back to `default`.
   */
  parse: (data: unknown) => T | null;
  /** Used when nothing valid is stored. */
  default: T;
  /** Split across several items, for sync values that may pass 8 KB. */
  chunked?: boolean;
  /** Human-readable name, e.g. in the import summary; defaults to `key`. */
  label?: string;
  /** Holds a secret (an API key): left out of exports unless asked for. */
  secret?: boolean;
}

/** A settings slice, as returned by `defineSettingsSlice`. */
export type SettingsSlice<T> = Readonly<SettingsSliceOptions<T>>;

/** The current value of a slice. */
export interface SliceState<T> {
  /** False until the first read from storage has finished. */
  loaded: boolean;
  value: T;
}

/**
 * Defines a slice of settings stored under one key and adds it to the slice
 * registry (`listSettingsSlices`).
 */
export function defineSettingsSlice<T>(
  options: SettingsSliceOptions<T>,
): SettingsSlice<T> {
  if (!options.key || options.key.includes(':')) {
    throw new Error(`Invalid settings key "${options.key}"`);
  }
  const slice = Object.freeze({...options});
  registerSlice(slice);
  return slice;
}

const backends = new Map<StorageArea, StorageBackend>();

function backendFor(area: StorageArea): StorageBackend {
  const backend = backends.get(area) ?? createBackend(area);
  backends.set(area, backend);
  return backend;
}

/** Which storage a slice is kept in (for "dev mode" hints). */
export function sliceBackendKind(
  slice: SettingsSlice<unknown>,
): StorageBackendKind {
  return backendFor(slice.area).kind;
}

interface SliceStore<T> {
  state: SliceState<T>;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => SliceState<T>;
  refresh: () => Promise<void>;
}

const stores = new WeakMap<SettingsSlice<unknown>, SliceStore<unknown>>();

async function readSlice<T>(slice: SettingsSlice<T>): Promise<T> {
  const backend = backendFor(slice.area);
  let raw: unknown;
  try {
    raw = slice.chunked
      ? await readChunked(backend, slice.key)
      : (await backend.get([slice.key]))[slice.key];
  } catch (err) {
    console.error(`Could not read setting "${slice.key}"`, err);
  }
  return raw === undefined
    ? slice.default
    : (slice.parse(raw) ?? slice.default);
}

function createStore<T>(slice: SettingsSlice<T>): SliceStore<T> {
  const listeners = new Set<() => void>();
  let unsubscribeBackend: (() => void) | null = null;
  let readSeq = 0;

  const store: SliceStore<T> = {
    state: {loaded: false, value: slice.default},
    getSnapshot: () => store.state,
    refresh: async () => {
      const seq = ++readSeq;
      const value = await readSlice(slice);
      // A newer read started while this one was in flight; let it win
      if (seq !== readSeq) return;
      store.state = {loaded: true, value};
      listeners.forEach(listener => listener());
    },
    // The first listener starts watching storage and the last one stops it
    subscribe: listener => {
      listeners.add(listener);
      if (!unsubscribeBackend) {
        unsubscribeBackend = backendFor(slice.area).subscribe(keys => {
          const mine = keys?.some(key =>
            slice.chunked ? isChunkedKey(slice.key, key) : key === slice.key,
          );
          if (keys === null || mine) void store.refresh();
        });
        void store.refresh();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && unsubscribeBackend) {
          unsubscribeBackend();
          unsubscribeBackend = null;
        }
      };
    },
  };
  return store;
}

function storeFor<T>(slice: SettingsSlice<T>): SliceStore<T> {
  const store = stores.get(slice) ?? createStore(slice);
  stores.set(slice, store);
  // Each slice gets the store created for it above, so T matches
  return store as SliceStore<T>;
}

/** Reads a slice from storage once: its parsed value, or the default. */
export function loadSlice<T>(slice: SettingsSlice<T>): Promise<T> {
  return readSlice(slice);
}

/** Watches a slice outside React; returns unsubscribe. */
export function subscribeSlice<T>(
  slice: SettingsSlice<T>,
  listener: () => void,
): () => void {
  return storeFor(slice).subscribe(listener);
}

/** The latest state of a slice (unloaded until someone subscribes). */
export function getSliceState<T>(slice: SettingsSlice<T>): SliceState<T> {
  return storeFor(slice).state;
}

async function write<T>(slice: SettingsSlice<T>, action: () => Promise<void>) {
  try {
    await action();
  } catch (err) {
    if (err instanceof SettingsWriteError) throw err;
    throw new SettingsWriteError(describeWriteError(err), {cause: err});
  }
  await storeFor(slice).refresh();
}

/** Saves a slice; rejects with `SettingsWriteError` if storage refuses it. */
export function saveSlice<T>(slice: SettingsSlice<T>, value: T): Promise<void> {
  const backend = backendFor(slice.area);
  return write(slice, async () => {
    if (slice.chunked) return writeChunked(backend, slice.key, value);
    if (slice.area === 'sync') checkItemSize(slice.key, value);
    await backend.set({[slice.key]: value});
  });
}

/** Removes a slice's stored value so its default applies. */
export function resetSlice<T>(slice: SettingsSlice<T>): Promise<void> {
  const backend = backendFor(slice.area);
  return write(slice, () =>
    slice.chunked
      ? removeChunked(backend, slice.key)
      : backend.remove([slice.key]),
  );
}

/**
 * A slice's current value; re-renders when it changes here or on another tab
 * or device.
 */
export function useSlice<T>(slice: SettingsSlice<T>): SliceState<T> {
  const store = storeFor(slice);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
