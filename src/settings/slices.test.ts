import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  installChromeStorageMock,
  type ChromeStorageMock,
} from '../test/chromeStorageMock';

type SlicesModule = typeof import('./slices');

// Backends are picked on first use per module instance, so import fresh
async function loadSlices(): Promise<SlicesModule> {
  vi.resetModules();
  return import('./slices');
}

function parseString(data: unknown) {
  return typeof data === 'string' ? data : null;
}

function parseList(data: unknown) {
  return Array.isArray(data) && data.every(x => typeof x === 'string')
    ? data
    : null;
}

async function setup() {
  const slices = await loadSlices();
  const text = slices.defineSettingsSlice({
    key: 'test.text',
    area: 'sync',
    parse: parseString,
    default: 'fallback',
  });
  const local = slices.defineSettingsSlice({
    key: 'test.local',
    area: 'local',
    parse: parseString,
    default: '',
  });
  const big = slices.defineSettingsSlice<readonly string[]>({
    key: 'test.big',
    area: 'sync',
    parse: parseList,
    default: [],
    chunked: true,
  });
  return {slices, text, local, big};
}

const unsubscribers: Array<() => void> = [];

/** Subscribes (which triggers the first read) and waits until loaded. */
async function start<T>(
  slices: SlicesModule,
  slice: import('./slices').SettingsSlice<T>,
) {
  const listener = vi.fn();
  unsubscribers.push(slices.subscribeSlice(slice, listener));
  await vi.waitFor(() => expect(slices.getSliceState(slice).loaded).toBe(true));
  return listener;
}

afterEach(() => {
  unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
  window.localStorage.clear();
});

describe('defineSettingsSlice', () => {
  it('rejects keys that would clash with chunk keys', async () => {
    const {slices} = await setup();
    expect(() =>
      slices.defineSettingsSlice({
        key: 'a:0',
        area: 'sync',
        parse: parseString,
        default: '',
      }),
    ).toThrow(/Invalid settings key/);
  });

  it('registers every slice it defines, in definition order', async () => {
    const {text, local, big} = await setup();
    const {listSettingsSlices} = await import('./sliceRegistry');
    expect(listSettingsSlices()).toEqual([text, local, big]);
  });

  it('lets a redefinition replace a slice with the same area and key', async () => {
    const {slices, local, big} = await setup();
    const again = slices.defineSettingsSlice({
      key: 'test.text',
      area: 'sync',
      parse: parseString,
      default: 'other',
      secret: true,
    });
    const sameKeyOtherArea = slices.defineSettingsSlice({
      key: 'test.big',
      area: 'local',
      parse: parseString,
      default: '',
    });
    const {listSettingsSlices} = await import('./sliceRegistry');
    expect(listSettingsSlices()).toEqual([again, local, big, sameKeyOtherArea]);
  });
});

describe('loadSlice', () => {
  it('reads the stored value once, or the default', async () => {
    const {slices, text} = await setup();
    expect(await slices.loadSlice(text)).toBe('fallback');
    window.localStorage.setItem('new-tab:test.text', '"stored"');
    expect(await slices.loadSlice(text)).toBe('stored');
  });
});

describe('with chrome.storage', () => {
  let mock: ChromeStorageMock;

  beforeEach(() => {
    mock = installChromeStorageMock();
  });

  it('starts unloaded with the default, then loads the stored value', async () => {
    mock.data.set('test.text', 'stored');
    const {slices, text} = await setup();
    expect(slices.getSliceState(text)).toEqual({
      loaded: false,
      value: 'fallback',
    });
    expect(slices.sliceBackendKind(text)).toBe('chrome-sync');

    await start(slices, text);
    expect(slices.getSliceState(text)).toEqual({loaded: true, value: 'stored'});
  });

  it('falls back to the default when parse rejects the data', async () => {
    mock.data.set('test.text', 42);
    const {slices, text} = await setup();
    await start(slices, text);
    expect(slices.getSliceState(text).value).toBe('fallback');
  });

  it('falls back to the default when the read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const {slices, text} = await setup();
    vi.spyOn(chrome.storage.sync, 'get').mockRejectedValue(new Error('boom'));
    await start(slices, text);
    expect(slices.getSliceState(text)).toEqual({
      loaded: true,
      value: 'fallback',
    });
  });

  it('saves and resets', async () => {
    const {slices, text} = await setup();
    await start(slices, text);

    await slices.saveSlice(text, 'new');
    expect(mock.data.get('test.text')).toBe('new');
    expect(slices.getSliceState(text).value).toBe('new');

    await slices.resetSlice(text);
    expect(mock.data.has('test.text')).toBe(false);
    expect(slices.getSliceState(text).value).toBe('fallback');
  });

  it('keeps local slices in chrome.storage.local', async () => {
    const {slices, local} = await setup();
    expect(slices.sliceBackendKind(local)).toBe('chrome-local');
    await start(slices, local);
    await slices.saveSlice(local, 'x'.repeat(10_000));
    expect(mock.localData.get('test.local')).toHaveLength(10_000);
    expect(mock.data.has('test.local')).toBe(false);
  });

  it('rejects sync items over the per-item quota before writing', async () => {
    const {slices, text} = await setup();
    await start(slices, text);
    const set = vi.spyOn(chrome.storage.sync, 'set');

    const result = slices.saveSlice(text, 'x'.repeat(9000));
    await expect(result).rejects.toThrow(slices.SettingsWriteError);
    await expect(result).rejects.toThrow(/too much data/);
    expect(set).not.toHaveBeenCalled();
  });

  it('stores chunked slices across items and reads them back', async () => {
    const {slices, big} = await setup();
    await start(slices, big);
    const value = Array.from({length: 100}, (_, i) => `${i}`.repeat(100));

    await slices.saveSlice(big, value);
    // ~10 KB of JSON, which grows with escaping inside the string chunks
    expect(mock.data.get('test.big')).toEqual({chunks: 3});
    expect(mock.data.has('test.big:2')).toBe(true);
    expect(slices.getSliceState(big).value).toEqual(value);

    await slices.resetSlice(big);
    expect([...mock.data.keys()]).toEqual([]);
    expect(slices.getSliceState(big).value).toEqual([]);
  });

  it.each([
    ['QUOTA_BYTES_PER_ITEM quota exceeded', /8 KB/],
    ['QUOTA_BYTES quota exceeded', /storage is full/],
    ['MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded', /Too many saves/],
    ['Something else broke', /Could not save settings: Something else broke/],
  ])('maps chrome error %j to a readable message', async (error, expected) => {
    const {slices, text} = await setup();
    await start(slices, text);
    mock.failNextWrite(error);

    const result = slices.saveSlice(text, 'k');
    await expect(result).rejects.toThrow(slices.SettingsWriteError);
    await expect(result).rejects.toThrow(expected);
    expect(mock.data.has('test.text')).toBe(false);
  });

  it('updates live when another device changes the slice', async () => {
    const {slices, text, big} = await setup();
    const listener = await start(slices, text);
    await start(slices, big);
    listener.mockClear();

    mock.externalSet({unrelated: 1});
    await new Promise(r => setTimeout(r, 5));
    expect(listener).not.toHaveBeenCalled();

    mock.externalSet({'test.text': 'from-laptop'});
    await vi.waitFor(() =>
      expect(slices.getSliceState(text).value).toBe('from-laptop'),
    );
    expect(listener).toHaveBeenCalled();

    mock.externalSet({'test.big:0': '["a"]', 'test.big': {chunks: 1}});
    await vi.waitFor(() =>
      expect(slices.getSliceState(big).value).toEqual(['a']),
    );

    mock.externalRemove('test.text');
    await vi.waitFor(() =>
      expect(slices.getSliceState(text).value).toBe('fallback'),
    );
  });

  it('ignores a stale read that finishes after a newer one', async () => {
    mock.data.set('test.text', 'old');
    mock.deferGets = true;
    const {slices, text} = await setup();
    unsubscribers.push(slices.subscribeSlice(text, () => {}));
    expect(mock.pendingGets).toHaveLength(1); // initial read, sees "old"

    mock.externalSet({'test.text': 'new'});
    await vi.waitFor(() => expect(mock.pendingGets).toHaveLength(2));

    const [first, second] = mock.pendingGets;
    second();
    await vi.waitFor(() =>
      expect(slices.getSliceState(text).value).toBe('new'),
    );
    first();
    await new Promise(r => setTimeout(r, 5));
    expect(slices.getSliceState(text).value).toBe('new');
  });

  it('stops listening when the last subscriber leaves', async () => {
    const {slices, text} = await setup();
    await start(slices, text);
    expect(mock.listenerCount()).toBe(1);
    unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
    expect(mock.listenerCount()).toBe(0);
  });
});

describe('with the localStorage fallback', () => {
  it('round-trips values under per-area prefixes', async () => {
    const {slices, text, local} = await setup();
    expect(slices.sliceBackendKind(text)).toBe('local-storage');
    await start(slices, text);
    await start(slices, local);

    await slices.saveSlice(text, 'dev');
    await slices.saveSlice(local, 'here');
    expect(window.localStorage.getItem('new-tab:test.text')).toBe('"dev"');
    expect(window.localStorage.getItem('new-tab-local:test.local')).toBe(
      '"here"',
    );
  });

  it('surfaces a full localStorage as a SettingsWriteError', async () => {
    const {slices, text} = await setup();
    await start(slices, text);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await expect(slices.saveSlice(text, 'k')).rejects.toThrow(
      "This browser's storage is full.",
    );
  });

  it('picks up changes made in another tab', async () => {
    const {slices, text} = await setup();
    await start(slices, text);

    window.localStorage.setItem('new-tab:test.text', '"other-tab"');
    window.dispatchEvent(
      new StorageEvent('storage', {key: 'new-tab:test.text'}),
    );
    await vi.waitFor(() =>
      expect(slices.getSliceState(text).value).toBe('other-tab'),
    );
  });
});

describe('useSlice', () => {
  it('renders the loaded value and re-renders on save', async () => {
    const {slices, text} = await setup();
    const {result} = renderHook(() => slices.useSlice(text));
    expect(result.current).toEqual({loaded: false, value: 'fallback'});
    await vi.waitFor(() => expect(result.current.loaded).toBe(true));

    await act(() => slices.saveSlice(text, 'saved'));
    expect(result.current).toEqual({loaded: true, value: 'saved'});
  });
});
