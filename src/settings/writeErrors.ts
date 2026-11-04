import {itemBytes, QUOTA_BYTES_PER_ITEM} from './quota';

/** A write was rejected (quota exceeded, storage unavailable, ...). */
export class SettingsWriteError extends Error {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'SettingsWriteError';
  }
}

/** A user-facing message for a failed storage write. */
export function describeWriteError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('QUOTA_BYTES_PER_ITEM')) {
    return "That's too much data for one setting (Chrome sync allows 8 KB). Remove some links and try again.";
  }
  if (message.includes('QUOTA_BYTES')) {
    return 'Chrome sync storage is full for this extension.';
  }
  if (message.includes('MAX_WRITE_OPERATIONS')) {
    return 'Too many saves in a short time. Wait a minute and try again.';
  }
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return "This browser's storage is full.";
  }
  return `Could not save settings: ${message}`;
}

/**
 * Throws a `SettingsWriteError` before writing an item that would exceed the
 * sync per-item quota.
 */
export function checkItemSize(key: string, value: unknown) {
  const bytes = itemBytes(key, value);
  if (bytes > QUOTA_BYTES_PER_ITEM) {
    throw new SettingsWriteError(
      `That's too much data for one setting (${bytes} of ${QUOTA_BYTES_PER_ITEM} bytes). Remove some links and try again.`,
    );
  }
}
