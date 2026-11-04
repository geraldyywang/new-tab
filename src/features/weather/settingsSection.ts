import type {SettingsSection} from '../../settings/sections';
import {ApiKeySettings} from './ApiKeySettings';
import {weatherApiKeySlice} from './settings';

/** Settings dialog entry for the WeatherAPI key. */
export const weatherSettingsSection: SettingsSection = {
  id: 'apiKey',
  title: 'Weather API key',
  order: 10,
  slices: [weatherApiKeySlice],
  Component: ApiKeySettings,
};
