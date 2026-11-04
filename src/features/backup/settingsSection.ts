import type {SettingsSection} from '../../settings/sections';
import {BackupSettings} from './BackupSettings';

/** Settings dialog entry for exporting and importing settings. */
export const backupSettingsSection: SettingsSection = {
  id: 'backup',
  title: 'Import and export',
  order: 90,
  // Reads and writes slices on demand, so nothing to wait for
  slices: [],
  Component: BackupSettings,
};
