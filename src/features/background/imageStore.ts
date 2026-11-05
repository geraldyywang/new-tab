/**
 * The background photo, kept in IndexedDB on this computer only (never in
 * `chrome.storage.sync`, whose items are limited to 8 KB). One record holds
 * the processed image, its palette and a little metadata about it.
 */
import {parsePhotoPalette, type PhotoPalette} from './photoPalette';

/** What is known about the stored photo besides its bytes. */
export interface StoredImageMeta {
  /** Pixel size after downscaling. */
  width: number;
  height: number;
  /** MIME type of the stored blob, normally `image/webp`. */
  type: string;
  byteSize: number;
  /** When it was stored, in ms since the epoch. */
  updatedAt: number;
}

/** The stored photo, its metadata and its palette. */
export interface StoredImage extends StoredImageMeta {
  blob: Blob;
  palette: PhotoPalette;
}

const DB_NAME = 'new-tab';
const DB_VERSION = 1;
const STORE_NAME = 'background';
const RECORD_KEY = 'photo';

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Validates a record read from IndexedDB; `null` if it is unusable. */
export function parseStoredImage(data: unknown): StoredImage | null {
  if (typeof data !== 'object' || data === null) return null;
  const record: Partial<Record<keyof StoredImage, unknown>> = data;
  const {blob, width, height, type, byteSize, updatedAt} = record;
  const palette = parsePhotoPalette(record.palette);
  if (!palette) return null;
  if (!(blob instanceof Blob) || blob.size === 0) return null;
  if (!isPositiveNumber(width) || !isPositiveNumber(height)) return null;
  if (typeof type !== 'string' || !type.startsWith('image/')) return null;
  if (!isPositiveNumber(byteSize) || typeof updatedAt !== 'number') {
    return null;
  }
  return {blob, width, height, type, byteSize, updatedAt, palette};
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('open failed'));
    request.onblocked = () => reject(new Error('Image storage is blocked'));
  });
}

/**
 * Runs `work` in one transaction and resolves with its result once the
 * transaction has committed (so a quota failure on commit rejects).
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = work(transaction.objectStore(STORE_NAME));
      function fail() {
        reject(transaction.error ?? request.error ?? new Error('aborted'));
      }
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = fail;
      transaction.onabort = fail;
    });
  } finally {
    db.close();
  }
}

/** Stores the photo, replacing any previous one. */
export async function putImage(image: StoredImage): Promise<void> {
  await withStore('readwrite', store => store.put(image, RECORD_KEY));
}

/** The stored photo, or `null` if there is none or it is unusable. */
export async function getImage(): Promise<StoredImage | null> {
  const data = await withStore<unknown>('readonly', store =>
    store.get(RECORD_KEY),
  );
  return parseStoredImage(data);
}

/** Removes the stored photo. */
export async function deleteImage(): Promise<void> {
  await withStore('readwrite', store => store.delete(RECORD_KEY));
}
