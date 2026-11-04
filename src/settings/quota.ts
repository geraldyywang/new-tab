/**
 * `chrome.storage.sync.QUOTA_BYTES_PER_ITEM`, also enforced in dev so behaviour
 * matches the extension.
 */
export const QUOTA_BYTES_PER_ITEM = 8192;

/**
 * Size of one storage item as Chrome counts it: the key plus the JSON of the
 * value, in UTF-8 bytes (which is never less than Chrome's own count).
 */
export function itemBytes(key: string, value: unknown): number {
  return new TextEncoder().encode(key + JSON.stringify(value)).length;
}
