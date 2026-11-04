import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  installChromeStorageMock,
  type ChromeStorageMock,
} from '../../test/chromeStorageMock';

let mock: ChromeStorageMock;
let unsubscribe: () => void;
// Slices cache their backend and state per module instance; start fresh
let slices: typeof import('../../settings/slices');
let settings: typeof import('./settings');

beforeEach(async () => {
  mock = installChromeStorageMock();
  vi.resetModules();
  slices = await import('../../settings/slices');
  settings = await import('./settings');
  unsubscribe = slices.subscribeSlice(settings.weatherApiKeySlice, () => {});
});
afterEach(() => unsubscribe());

describe('weatherApiKeySlice', () => {
  it('is synced under weather.apiKey', () => {
    expect(settings.weatherApiKeySlice.key).toBe('weather.apiKey');
    expect(settings.weatherApiKeySlice.area).toBe('sync');
  });

  it('trims stored keys and rejects non-strings', () => {
    expect(settings.weatherApiKeySlice.parse('  key-123  ')).toBe('key-123');
    expect(settings.weatherApiKeySlice.parse(42)).toBeNull();
  });

  it('saves the trimmed key and removes it when cleared', async () => {
    await settings.saveWeatherApiKey('  new-key ');
    expect(mock.data.get('weather.apiKey')).toBe('new-key');
    expect(slices.getSliceState(settings.weatherApiKeySlice).value).toBe(
      'new-key',
    );

    await settings.saveWeatherApiKey('   ');
    expect(mock.data.has('weather.apiKey')).toBe(false);
    expect(slices.getSliceState(settings.weatherApiKeySlice).value).toBe('');
  });
});
