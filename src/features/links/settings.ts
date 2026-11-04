import {
  defineSettingsSlice,
  resetSlice,
  saveSlice,
  type SettingsSlice,
} from '../../settings/slices';
import {
  DEFAULT_SIDEBAR_LINKS,
  DEFAULT_SOCIAL_LINKS,
  sanitizeLinks,
  type StoredLink,
} from './links';

/** A settings slice holding one link list. */
export type LinkListSlice = SettingsSlice<readonly StoredLink[]>;

/** Links in the quick-access sidebar on the right. */
export const sidebarLinksSlice: LinkListSlice = defineSettingsSlice({
  key: 'links.sidebar',
  area: 'sync',
  parse: sanitizeLinks,
  default: DEFAULT_SIDEBAR_LINKS,
});

/** Links in the socials bar at the bottom left. */
export const socialLinksSlice: LinkListSlice = defineSettingsSlice({
  key: 'links.social',
  area: 'sync',
  parse: sanitizeLinks,
  default: DEFAULT_SOCIAL_LINKS,
});

/** Saves a link list; `null` removes it so the defaults are used. */
export function saveLinkList(
  slice: LinkListSlice,
  links: StoredLink[] | null,
): Promise<void> {
  return links ? saveSlice(slice, links) : resetSlice(slice);
}
