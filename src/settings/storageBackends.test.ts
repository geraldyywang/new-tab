import {afterEach, describe, expect, it, vi} from 'vitest';
import {installChromeStorageMock} from '../test/chromeStorageMock';
import {
  chromeBackend,
  createBackend,
  hasChromeStorage,
  LOCAL_STORAGE_PREFIX,
  localStorageBackend,
} from './storageBackends';

afterEach(() => window.localStorage.clear());

describe('backend selection', () => {
  it('uses chrome.storage when it exists', () => {
    installChromeStorageMock();
    expect(hasChromeStorage('sync')).toBe(true);
    expect(createBackend('sync').kind).toBe('chrome-sync');
    expect(createBackend('local').kind).toBe('chrome-local');
  });

  it('falls back to localStorage without the chrome global', () => {
    expect(hasChromeStorage('sync')).toBe(false);
    expect(createBackend('sync').kind).toBe('local-storage');
    expect(createBackend('local').kind).toBe('local-storage');
  });

  it('falls back to localStorage on a regular web page in Chrome', () => {
    // Chrome exposes `chrome` to pages, but without `storage`
    vi.stubGlobal('chrome', {runtime: {}});
    expect(createBackend('sync').kind).toBe('local-storage');
  });
});

describe('chromeBackend', () => {
  it('reads, writes and removes only the asked-for keys', async () => {
    const mock = installChromeStorageMock();
    mock.data.set('unrelated', 1);
    const backend = chromeBackend('sync');

    await backend.set({a: 'abc', b: 2});
    expect(await backend.get(['a', 'missing'])).toEqual({a: 'abc'});

    await backend.remove(['a', 'b']);
    expect(await backend.get(['a', 'b'])).toEqual({});
    expect(mock.data.get('unrelated')).toBe(1);
  });

  it('keeps the sync and local areas apart', async () => {
    const mock = installChromeStorageMock();
    await chromeBackend('local').set({a: 'here'});
    expect(mock.localData.get('a')).toBe('here');
    expect(mock.data.has('a')).toBe(false);
    expect(await chromeBackend('sync').get(['a'])).toEqual({});
  });

  it('reports changed keys for its own area only', async () => {
    const mock = installChromeStorageMock();
    const onChange = vi.fn();
    const unsubscribe = chromeBackend('local').subscribe(onChange);

    mock.externalSet({other: 1}, 'sync');
    await new Promise(r => setTimeout(r, 5));
    expect(onChange).not.toHaveBeenCalled();

    mock.externalSet({x: 1, y: 2}, 'local');
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(['x', 'y']));

    unsubscribe();
    expect(mock.listenerCount()).toBe(0);
  });
});

describe('localStorageBackend', () => {
  it('stores JSON under a per-area prefix', async () => {
    const backend = localStorageBackend('sync');
    await backend.set({links: [{id: 'a'}]});
    expect(
      window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX.sync}links`),
    ).toBe('[{"id":"a"}]');
    expect(await backend.get(['links'])).toEqual({links: [{id: 'a'}]});
    expect(await localStorageBackend('local').get(['links'])).toEqual({});

    await backend.remove(['links']);
    expect(await backend.get(['links'])).toEqual({});
  });

  it('uses distinct prefixes for the two areas', () => {
    expect(LOCAL_STORAGE_PREFIX.local).not.toBe(LOCAL_STORAGE_PREFIX.sync);
    expect(
      LOCAL_STORAGE_PREFIX.local.startsWith(LOCAL_STORAGE_PREFIX.sync),
    ).toBe(false);
  });

  it('skips items with corrupt JSON', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX.sync}a`, '{oops');
    window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX.sync}b`, '[]');
    expect(await localStorageBackend('sync').get(['a', 'b'])).toEqual({b: []});
  });

  it('notifies on storage events for its prefix or a full clear', () => {
    const onChange = vi.fn();
    const unsubscribe = localStorageBackend('sync').subscribe(onChange);

    window.dispatchEvent(new StorageEvent('storage', {key: 'other'}));
    window.dispatchEvent(
      new StorageEvent('storage', {key: `${LOCAL_STORAGE_PREFIX.local}a`}),
    );
    expect(onChange).not.toHaveBeenCalled();

    window.dispatchEvent(
      new StorageEvent('storage', {key: `${LOCAL_STORAGE_PREFIX.sync}links`}),
    );
    expect(onChange).toHaveBeenLastCalledWith(['links']);
    window.dispatchEvent(new StorageEvent('storage', {key: null}));
    expect(onChange).toHaveBeenLastCalledWith(null);

    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', {key: null}));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
