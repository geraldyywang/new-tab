/**
 * The settings dialog's sections. Each feature defines its section next to
 * its code and adds one line here.
 */
import type {ComponentType} from 'react';
import type {SettingsSlice} from './slices';
import {weatherSettingsSection} from '../features/weather/settingsSection';
import {
  sidebarLinksSettingsSection,
  socialLinksSettingsSection,
} from '../features/links/settingsSections';
import {appearanceSettingsSection} from '../features/appearance/settingsSection';

/** Props the dialog passes to every section component. */
export interface SettingsSectionProps {
  /** The section's heading (from its registry entry). */
  title: string;
  /** Report unsaved edits, for the dialog's discard prompt. */
  onDirtyChange: (dirty: boolean) => void;
}

/** One section of the settings dialog. */
export interface SettingsSection {
  /** Unique id, used for dirty tracking. */
  id: string;
  title: string;
  /** Sections render in ascending order. */
  order: number;
  /** Slices the section edits; the dialog waits until they have loaded. */
  slices: ReadonlyArray<SettingsSlice<unknown>>;
  Component: ComponentType<SettingsSectionProps>;
}

/** Sorts sections by `order`; throws on a duplicate id. */
export function sortSections(
  sections: readonly SettingsSection[],
): readonly SettingsSection[] {
  const ids = new Set(sections.map(section => section.id));
  if (ids.size !== sections.length) {
    throw new Error('Duplicate settings section id');
  }
  return [...sections].sort((a, b) => a.order - b.order);
}

/** Every section of the settings dialog, in display order. */
export const SETTINGS_SECTIONS = sortSections([
  weatherSettingsSection,
  sidebarLinksSettingsSection,
  socialLinksSettingsSection,
  appearanceSettingsSection,
]);
