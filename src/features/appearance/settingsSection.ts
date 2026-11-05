import type {SettingsSection} from '../../settings/sections';
import {clockSlice} from '../clock/settings';
import {AppearanceSettings} from './AppearanceSettings';
import {themeSlice} from './themeSettings';

/** Settings dialog entry for the theme, accent and clock. */
export const appearanceSettingsSection: SettingsSection = {
  id: 'appearance',
  title: 'Appearance',
  order: 40,
  slices: [themeSlice, clockSlice],
  Component: AppearanceSettings,
};
