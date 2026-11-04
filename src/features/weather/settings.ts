import {
  defineSettingsSlice,
  resetSlice,
  saveSlice,
} from '../../settings/slices';

/** The user's WeatherAPI key; empty until they add one. */
export const weatherApiKeySlice = defineSettingsSlice<string>({
  key: 'weather.apiKey',
  area: 'sync',
  parse: data => (typeof data === 'string' ? data.trim() : null),
  default: '',
});

/** Saves the WeatherAPI key; an empty string removes it. */
export function saveWeatherApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  return trimmed
    ? saveSlice(weatherApiKeySlice, trimmed)
    : resetSlice(weatherApiKeySlice);
}
