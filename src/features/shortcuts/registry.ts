/**
 * Every keyboard shortcut, for the shortcuts list and clash checks. To add
 * one, define it here (or next to its feature and list it here), then bind
 * it with `useShortcut` where it acts.
 */
import type {Shortcut} from './shortcuts';

/** `,` or Ctrl/Cmd+`,` opens the settings dialog. */
export const OPEN_SETTINGS_SHORTCUT: Shortcut = {
  id: 'openSettings',
  combos: [{key: ','}, {key: ',', mod: true}],
  description: 'Open settings',
};

/** Reserved for a search box. */
export const FOCUS_SEARCH_SHORTCUT: Shortcut = {
  id: 'focusSearch',
  combos: [{key: '/'}],
  description: 'Focus search',
  reserved: true,
};

/** Handled by the settings dialog itself; listed for reference. */
export const CLOSE_DIALOG_SHORTCUT: Shortcut = {
  id: 'closeDialog',
  combos: [{key: 'Escape'}],
  description: 'Close settings',
};

/** All shortcuts, in the order the shortcuts list shows them. */
export const SHORTCUTS: readonly Shortcut[] = [
  OPEN_SETTINGS_SHORTCUT,
  CLOSE_DIALOG_SHORTCUT,
  FOCUS_SEARCH_SHORTCUT,
];
