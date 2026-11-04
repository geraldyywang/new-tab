import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  installChromeStorageMock,
  type ChromeStorageMock,
} from '../test/chromeStorageMock';
import {
  DEFAULT_SIDEBAR_LINKS,
  DEFAULT_SOCIAL_LINKS,
} from '../features/links/links';

type StorageModule = typeof import('./storage');

// storage.ts picks its backend at import time, so import it fresh per test
async function loadStorage(): Promise<StorageModule> {
  vi.resetModules();
  return import('./storage');
}

let unsubscribe: (() => void) | undefined;

/** Subscribes (which triggers the first read) and waits until loaded. */
async function startStore(storage: StorageModule) {
  const listener = vi.fn();
  unsubscribe = storage.subscribeSettings(listener);
  await vi.waitFor(() =>
    expect(storage.getSettingsSnapshot().loaded).toBe(true),
  );
  return listener;
}

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  window.localStorage.clear();
});

describe('with chrome.storage.sync', () => {
  let mock: ChromeStorageMock;

  beforeEach(() => {
    mock = installChromeStorageMock();
  });

  it('starts unloaded with defaults, then loads stored values', async () => {
    mock.data.set('weatherApiKey', '  key-123  ');
    mock.data.set('socialLinks', [
      {id: 'a', label: 'A', url: 'https://a.example.com'},
    ]);
    const storage = await loadStorage();

    const initial = storage.getSettingsSnapshot();
    expect(initial.loaded).toBe(false);
    expect(initial.backend).toBe('chrome-sync');

    await startStore(storage);
    const loaded = storage.getSettingsSnapshot();
    expect(loaded.weatherApiKey).toBe('key-123');
    expect(loaded.sidebarLinks).toEqual(DEFAULT_SIDEBAR_LINKS);
    expect(loaded.socialLinks).toEqual([
      {id: 'a', label: 'A', url: 'https://a.example.com/'},
    ]);
  });

  it('falls back to defaults for corrupt or wrongly typed values', async () => {
    mock.data.set('weatherApiKey', 42);
    mock.data.set('sidebarLinks', 'not a list');
    mock.data.set('socialLinks', {id: 'x'});
    const storage = await loadStorage();
    await startStore(storage);

    const s = storage.getSettingsSnapshot();
    expect(s.weatherApiKey).toBe('');
    expect(s.sidebarLinks).toEqual(DEFAULT_SIDEBAR_LINKS);
    expect(s.socialLinks).toEqual(DEFAULT_SOCIAL_LINKS);
  });

  it('drops unsafe links from a stored list', async () => {
    mock.data.set('sidebarLinks', [
      {id: 'bad', label: 'Bad', url: 'javascript:alert(1)'},
      {id: 'ok', label: 'OK', url: 'https://ok.example.com/'},
    ]);
    const storage = await loadStorage();
    await startStore(storage);
    expect(storage.getSettingsSnapshot().sidebarLinks.map(l => l.id)).toEqual([
      'ok',
    ]);
  });

  it('saves and clears the API key', async () => {
    const storage = await loadStorage();
    await startStore(storage);

    await storage.saveWeatherApiKey('  new-key ');
    expect(mock.data.get('weatherApiKey')).toBe('new-key');
    expect(storage.getSettingsSnapshot().weatherApiKey).toBe('new-key');

    await storage.saveWeatherApiKey('   ');
    expect(mock.data.has('weatherApiKey')).toBe(false);
    expect(storage.getSettingsSnapshot().weatherApiKey).toBe('');
  });

  it('saveLinks(null) removes the item so defaults apply', async () => {
    const custom = [{id: 'a', label: 'A', url: 'https://a.example.com/'}];
    const storage = await loadStorage();
    await startStore(storage);

    await storage.saveLinks('sidebarLinks', custom);
    expect(mock.data.get('sidebarLinks')).toEqual(custom);
    expect(storage.getSettingsSnapshot().sidebarLinks).toEqual(custom);

    await storage.saveLinks('sidebarLinks', null);
    expect(mock.data.has('sidebarLinks')).toBe(false);
    expect(storage.getSettingsSnapshot().sidebarLinks).toEqual(
      DEFAULT_SIDEBAR_LINKS,
    );
  });

  it('rejects items over the per-item quota before writing', async () => {
    const storage = await loadStorage();
    await startStore(storage);
    const set = vi.spyOn(chrome.storage.sync, 'set');

    const huge = Array.from({length: 50}, (_, i) => ({
      id: `id-${i}`,
      label: 'x'.repeat(100),
      url: `https://example.com/${'y'.repeat(200)}`,
    }));
    await expect(storage.saveLinks('socialLinks', huge)).rejects.toThrow(
      storage.SettingsWriteError,
    );
    await expect(storage.saveLinks('socialLinks', huge)).rejects.toThrow(
      /too much data/,
    );
    expect(set).not.toHaveBeenCalled();
    expect(mock.data.has('socialLinks')).toBe(false);
  });

  it.each([
    ['QUOTA_BYTES_PER_ITEM quota exceeded', /8 KB/],
    ['QUOTA_BYTES quota exceeded', /storage is full/],
    ['MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded', /Too many saves/],
    ['Something else broke', /Could not save settings: Something else broke/],
  ])('maps chrome error %j to a readable message', async (error, expected) => {
    const storage = await loadStorage();
    await startStore(storage);
    mock.failNextWrite(error);

    const result = storage.saveWeatherApiKey('k');
    await expect(result).rejects.toThrow(storage.SettingsWriteError);
    await expect(result).rejects.toThrow(expected);
    expect(mock.data.has('weatherApiKey')).toBe(false);
  });

  it('updates live when another device changes a setting', async () => {
    const storage = await loadStorage();
    const listener = await startStore(storage);
    listener.mockClear();

    mock.externalSet({weatherApiKey: 'from-laptop'});
    await vi.waitFor(() =>
      expect(storage.getSettingsSnapshot().weatherApiKey).toBe('from-laptop'),
    );
    expect(listener).toHaveBeenCalled();

    mock.externalRemove('weatherApiKey');
    await vi.waitFor(() =>
      expect(storage.getSettingsSnapshot().weatherApiKey).toBe(''),
    );
  });

  it('ignores a stale read that finishes after a newer one', async () => {
    mock.data.set('weatherApiKey', 'old');
    mock.deferGets = true;
    const storage = await loadStorage();
    unsubscribe = storage.subscribeSettings(() => {});
    expect(mock.pendingGets).toHaveLength(1); // initial read, sees "old"

    mock.externalSet({weatherApiKey: 'new'});
    await vi.waitFor(() => expect(mock.pendingGets).toHaveLength(2));

    const [first, second] = mock.pendingGets;
    second();
    await vi.waitFor(() =>
      expect(storage.getSettingsSnapshot().weatherApiKey).toBe('new'),
    );
    first();
    await new Promise(r => setTimeout(r, 5));
    expect(storage.getSettingsSnapshot().weatherApiKey).toBe('new');
  });

  it('stops listening when the last subscriber leaves', async () => {
    const storage = await loadStorage();
    await startStore(storage);
    expect(mock.listenerCount()).toBe(1);
    unsubscribe?.();
    unsubscribe = undefined;
    expect(mock.listenerCount()).toBe(0);
  });
});

describe('with the localStorage fallback', () => {
  it('is selected without chrome.storage and round-trips values', async () => {
    const storage = await loadStorage();
    expect(storage.getSettingsSnapshot().backend).toBe('local-storage');
    await startStore(storage);

    await storage.saveWeatherApiKey('dev-key');
    expect(window.localStorage.getItem('new-tab:weatherApiKey')).toBe(
      '"dev-key"',
    );
    expect(storage.getSettingsSnapshot().weatherApiKey).toBe('dev-key');
  });

  it('surfaces a full localStorage as a SettingsWriteError', async () => {
    const storage = await loadStorage();
    await startStore(storage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await expect(storage.saveWeatherApiKey('k')).rejects.toThrow(
      "This browser's storage is full.",
    );
  });

  it('picks up changes made in another tab', async () => {
    const storage = await loadStorage();
    await startStore(storage);

    window.localStorage.setItem('new-tab:weatherApiKey', '"other-tab"');
    window.dispatchEvent(
      new StorageEvent('storage', {key: 'new-tab:weatherApiKey'}),
    );
    await vi.waitFor(() =>
      expect(storage.getSettingsSnapshot().weatherApiKey).toBe('other-tab'),
    );
  });
});
