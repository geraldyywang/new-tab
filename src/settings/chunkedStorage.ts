/**
 * Stores a value too big for one `chrome.storage.sync` item (8 KB) across
 * several: its JSON text is split into string chunks at `key:0` .. `key:n-1`,
 * and the item at `key` holds a manifest `{chunks: n}`.
 *
 * Writes go chunks first, then the manifest, then stale chunks are removed,
 * so a reader never sees a manifest pointing past what was written by the
 * same save. A manifest whose chunks are missing or don't join into valid
 * JSON (e.g. another device's save landed half-way) reads as missing.
 */
import {itemBytes, QUOTA_BYTES_PER_ITEM} from './quota';
import type {RawItems, StorageBackend} from './storageBackends';

/** The item stored at the base key of a chunked value. */
export interface ChunkManifest {
  chunks: number;
}

/** Most chunks one value may use (sync allows 512 items in total). */
export const MAX_CHUNKS = 256;

/** The storage key of chunk `index` of `key`. */
export function chunkKey(key: string, index: number): string {
  return `${key}:${index}`;
}

/** Whether `key` is `base` itself or one of its chunks. */
export function isChunkedKey(base: string, key: string): boolean {
  return key === base || key.startsWith(`${base}:`);
}

/** Validates an untrusted manifest; `null` if it isn't one. */
export function parseManifest(value: unknown): ChunkManifest | null {
  if (typeof value !== 'object' || value === null) return null;
  const {chunks} = value as Record<string, unknown>;
  if (!Number.isInteger(chunks)) return null;
  const count = chunks as number; // Checked by Number.isInteger above
  return count >= 1 && count <= MAX_CHUNKS ? {chunks: count} : null;
}

/**
 * Splits `text` into pieces so that each `key:i` item fits in
 * `maxItemBytes`. Never splits a surrogate pair.
 */
export function splitIntoChunks(
  key: string,
  text: string,
  maxItemBytes = QUOTA_BYTES_PER_ITEM,
): string[] {
  const chunks: string[] = [];
  let piece = '';
  // Bytes `piece` will take as an item: key, quotes and escaped characters
  let bytes = itemBytes(chunkKey(key, 0), '');
  for (const char of text) {
    const charBytes = itemBytes('', char) - 2;
    if (piece && bytes + charBytes > maxItemBytes) {
      chunks.push(piece);
      piece = '';
      bytes = itemBytes(chunkKey(key, chunks.length), '');
    }
    if (bytes + charBytes > maxItemBytes) {
      throw new RangeError(`Key "${key}" is too long to chunk`);
    }
    piece += char;
    bytes += charBytes;
  }
  chunks.push(piece);
  return chunks;
}

/**
 * Joins chunks read from storage back into a value. Returns `undefined` when
 * any chunk is missing or the result isn't valid JSON.
 */
export function joinChunks(
  key: string,
  manifest: ChunkManifest,
  items: RawItems,
): unknown {
  let text = '';
  for (let i = 0; i < manifest.chunks; i++) {
    const piece = items[chunkKey(key, i)];
    if (typeof piece !== 'string') return undefined;
    text += piece;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function chunkKeys(key: string, from: number, to: number): string[] {
  return Array.from({length: Math.max(0, to - from)}, (_, i) =>
    chunkKey(key, from + i),
  );
}

/** Reads a chunked value; `undefined` when missing or unreadable. */
export async function readChunked(
  backend: StorageBackend,
  key: string,
): Promise<unknown> {
  const manifest = parseManifest((await backend.get([key]))[key]);
  if (!manifest) return undefined;
  const items = await backend.get(chunkKeys(key, 0, manifest.chunks));
  return joinChunks(key, manifest, items);
}

/** Writes `value` (anything JSON can encode) as chunks plus a manifest. */
export async function writeChunked(
  backend: StorageBackend,
  key: string,
  value: unknown,
  maxItemBytes = QUOTA_BYTES_PER_ITEM,
): Promise<void> {
  const chunks = splitIntoChunks(key, JSON.stringify(value), maxItemBytes);
  if (chunks.length > MAX_CHUNKS) {
    throw new RangeError(`"${key}" needs more than ${MAX_CHUNKS} chunks`);
  }
  const old = parseManifest((await backend.get([key]))[key]);
  const items: RawItems = {};
  chunks.forEach((piece, i) => (items[chunkKey(key, i)] = piece));
  await backend.set(items);
  const manifest: ChunkManifest = {chunks: chunks.length};
  await backend.set({[key]: manifest});
  const stale = chunkKeys(key, chunks.length, old?.chunks ?? 0);
  if (stale.length > 0) await backend.remove(stale);
}

/** Removes a chunked value: the manifest first, then its chunks. */
export async function removeChunked(
  backend: StorageBackend,
  key: string,
): Promise<void> {
  const old = parseManifest((await backend.get([key]))[key]);
  await backend.remove([key]);
  const stale = chunkKeys(key, 0, old?.chunks ?? 0);
  if (stale.length > 0) await backend.remove(stale);
}
