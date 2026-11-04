import type {SettingsSection} from '../../settings/sections';
import {ShortcutsSettings} from './ShortcutsSettings';

/** Settings dialog entry listing the keyboard shortcuts. */
export const shortcutsSettingsSection: SettingsSection = {
  id: 'shortcuts',
  title: 'Keyboard shortcuts',
  order: 100,
  slices: [],
  Component: ShortcutsSettings,
};
