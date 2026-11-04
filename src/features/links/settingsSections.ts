import type {SettingsSection} from '../../settings/sections';
import {SidebarLinksSettings, SocialLinksSettings} from './LinksSettings';
import {sidebarLinksSlice, socialLinksSlice} from './settings';

/** Settings dialog entry for the sidebar links. */
export const sidebarLinksSettingsSection: SettingsSection = {
  id: 'sidebarLinks',
  title: 'Sidebar links',
  order: 20,
  slices: [sidebarLinksSlice],
  Component: SidebarLinksSettings,
};

/** Settings dialog entry for the social links. */
export const socialLinksSettingsSection: SettingsSection = {
  id: 'socialLinks',
  title: 'Social links',
  order: 30,
  slices: [socialLinksSlice],
  Component: SocialLinksSettings,
};
