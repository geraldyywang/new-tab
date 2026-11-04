import {describe, expect, it} from 'vitest';
import {
  checkItemSize,
  describeWriteError,
  SettingsWriteError,
} from './writeErrors';

describe('checkItemSize', () => {
  it('allows items up to 8 KB including the key', () => {
    expect(() => checkItemSize('k', 'x'.repeat(8189))).not.toThrow();
  });

  it('throws a SettingsWriteError over 8 KB', () => {
    expect(() => checkItemSize('k', 'x'.repeat(8190))).toThrow(
      SettingsWriteError,
    );
    expect(() => checkItemSize('k', 'x'.repeat(8190))).toThrow(
      /too much data for one setting \(8193 of 8192/,
    );
  });

  it('counts multi-byte characters as UTF-8', () => {
    expect(() => checkItemSize('k', 'é'.repeat(4095))).toThrow(
      SettingsWriteError,
    );
  });
});

describe('describeWriteError', () => {
  it('describes a full localStorage', () => {
    expect(
      describeWriteError(new DOMException('full', 'QuotaExceededError')),
    ).toBe("This browser's storage is full.");
  });

  it('includes unknown messages', () => {
    expect(describeWriteError('nope')).toBe('Could not save settings: nope');
  });
});
