/**
 * The background photo as the page sees it: an object URL for the blob in
 * IndexedDB. Tabs tell each other about uploads and removals over a
 * `BroadcastChannel`.
 */
import {useSyncExternalStore} from 'react';
import {
  deleteImage,
  getImage,
  putImage,
  type StoredImage,
  type StoredImageMeta,
} from './imageStore';
import {storageError} from './imageProcessing';
import type {PhotoPalette} from '../../theme/photoPalette';

/** The current background photo. */
export interface BackgroundImageState {
  /** False until the first read from IndexedDB has finished. */
  loaded: boolean;
  /** Object URL of the photo; `null` when there is none (theme backdrop). */
  url: string | null;
  meta: StoredImageMeta | null;
  /** The photo's colours, which tint the page; `null` without a photo. */
  palette: PhotoPalette | null;
}

/** Where photos are kept; IndexedDB in the app, fakes in tests. */
export interface ImageBackend {
  get: () => Promise<StoredImage | null>;
  put: (image: StoredImage) => Promise<void>;
  remove: () => Promise<void>;
}

/** Holds the current photo and keeps its object URL up to date. */
export interface BackgroundImageStore {
  getState: () => BackgroundImageState;
  subscribe: (listener: () => void) => () => void;
  /** Starts the first read from storage (once). */
  load: () => void;
  /** Stores a processed photo and shows it; rejects with a user message. */
  save: (image: StoredImage) => Promise<void>;
  /** Removes the photo, going back to the theme backdrop. */
  remove: () => Promise<void>;
  /** The browser couldn't display the blob; use the backdrop instead. */
  markBroken: () => void;
}

const CHANNEL_NAME = 'new-tab:background';
const EMPTY: BackgroundImageState = {
  loaded: true,
  url: null,
  meta: null,
  palette: null,
};

/** Creates a store over `backend`; `channel` links it to other tabs. */
export function createBackgroundImageStore(
  backend: ImageBackend,
  channel?: BroadcastChannel,
): BackgroundImageStore {
  let state: BackgroundImageState = {...EMPTY, loaded: false};
  // Bumped by every read and write, so a stale read can't win
  let seq = 0;
  let started = false;
  const listeners = new Set<() => void>();

  function setState(next: BackgroundImageState) {
    // Release the previous blob once nothing shows it any more
    if (state.url && state.url !== next.url) URL.revokeObjectURL(state.url);
    state = next;
    listeners.forEach(listener => listener());
  }

  function show(image: StoredImage | null) {
    if (!image) return setState(EMPTY);
    const {width, height, type, byteSize, updatedAt} = image;
    setState({
      loaded: true,
      url: URL.createObjectURL(image.blob),
      meta: {width, height, type, byteSize, updatedAt},
      palette: image.palette,
    });
  }

  async function refresh() {
    const mySeq = ++seq;
    let image: StoredImage | null = null;
    try {
      image = await backend.get();
    } catch (err) {
      // Unreadable storage: fall back to the theme backdrop
      console.warn('Could not read the background photo', err);
    }
    if (mySeq === seq) show(image);
  }

  async function write(action: () => Promise<void>, image: StoredImage | null) {
    seq++;
    try {
      await action();
    } catch (err) {
      throw storageError(err);
    }
    seq++;
    show(image);
    channel?.postMessage('changed');
  }

  channel?.addEventListener('message', () => void refresh());

  const store: BackgroundImageStore = {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      store.load();
      return () => listeners.delete(listener);
    },
    load: () => {
      if (started) return;
      started = true;
      void refresh();
    },
    save: image => write(() => backend.put(image), image),
    remove: () => write(backend.remove, null),
    markBroken: () => {
      if (state.url) setState(EMPTY);
    },
  };
  return store;
}

/** The page's background photo, kept in IndexedDB. */
export const BACKGROUND_IMAGE = createBackgroundImageStore(
  {get: getImage, put: putImage, remove: deleteImage},
  typeof BroadcastChannel === 'undefined'
    ? undefined
    : new BroadcastChannel(CHANNEL_NAME),
);

/** The current background photo; re-renders when it changes. */
export function useBackgroundImage(
  store: BackgroundImageStore = BACKGROUND_IMAGE,
): BackgroundImageState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
