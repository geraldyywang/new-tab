import type {SettingsSection} from '../../settings/sections';
import {BackgroundSettings} from './BackgroundSettings';
import {backgroundDisplaySlice} from './settings';

/** Settings dialog entry for the background photo. */
export const backgroundSettingsSection: SettingsSection = {
  id: 'background',
  title: 'Background',
  order: 50,
  slices: [backgroundDisplaySlice],
  Component: BackgroundSettings,
};
