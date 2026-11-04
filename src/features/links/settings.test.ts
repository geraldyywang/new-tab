import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  installChromeStorageMock,
  type ChromeStorageMock,
} from '../../test/chromeStorageMock';
import {DEFAULT_SIDEBAR_LINKS, DEFAULT_SOCIAL_LINKS} from './links';

let mock: ChromeStorageMock;
const unsubscribers: Array<() => void> = [];
// Slices cache their backend and state per module instance; start fresh
let slices: typeof import('../../settings/slices');
let settings: typeof import('./settings');

beforeEach(async () => {
  mock = installChromeStorageMock();
  vi.resetModules();
  slices = await import('../../settings/slices');
  settings = await import('./settings');
});
afterEach(() => unsubscribers.splice(0).forEach(u => u()));

describe('link list slices', () => {
  it('are synced under their own keys with their own defaults', () => {
    expect(settings.sidebarLinksSlice.key).toBe('links.sidebar');
    expect(settings.socialLinksSlice.key).toBe('links.social');
    expect(settings.sidebarLinksSlice.default).toEqual(DEFAULT_SIDEBAR_LINKS);
    expect(settings.socialLinksSlice.default).toEqual(DEFAULT_SOCIAL_LINKS);
  });

  it('drop unsafe entries and reject non-lists', () => {
    expect(
      settings.sidebarLinksSlice.parse([
        {id: 'bad', label: 'Bad', url: 'javascript:alert(1)'},
        {id: 'ok', label: 'OK', url: 'https://ok.example.com/'},
      ]),
    ).toEqual([{id: 'ok', label: 'OK', url: 'https://ok.example.com/'}]);
    expect(settings.socialLinksSlice.parse('not a list')).toBeNull();
  });

  it('falls back to the defaults for corrupt stored data', async () => {
    mock.data.set('links.social', {id: 'x'});
    unsubscribers.push(
      slices.subscribeSlice(settings.socialLinksSlice, () => {}),
    );
    await vi.waitFor(() =>
      expect(slices.getSliceState(settings.socialLinksSlice).loaded).toBe(true),
    );
    expect(slices.getSliceState(settings.socialLinksSlice).value).toEqual(
      DEFAULT_SOCIAL_LINKS,
    );
  });

  it('saveLinkList(null) removes the item so defaults apply', async () => {
    const custom = [{id: 'a', label: 'A', url: 'https://a.example.com/'}];
    unsubscribers.push(
      slices.subscribeSlice(settings.sidebarLinksSlice, () => {}),
    );

    await settings.saveLinkList(settings.sidebarLinksSlice, custom);
    expect(mock.data.get('links.sidebar')).toEqual(custom);
    expect(slices.getSliceState(settings.sidebarLinksSlice).value).toEqual(
      custom,
    );

    await settings.saveLinkList(settings.sidebarLinksSlice, null);
    expect(mock.data.has('links.sidebar')).toBe(false);
    expect(slices.getSliceState(settings.sidebarLinksSlice).value).toEqual(
      DEFAULT_SIDEBAR_LINKS,
    );
  });
});
