/**
 * Live preview of unsaved display options: while the settings section has a
 * draft, the page shows it instead of the saved options.
 */
import {useSyncExternalStore} from 'react';
import {useSlice} from '../../settings/slices';
import {backgroundDisplaySlice, type BackgroundDisplay} from './settings';

let preview: BackgroundDisplay | null = null;
const listeners = new Set<() => void>();

/** Shows `display` on the page until cleared with `null`. */
export function setDisplayPreview(display: BackgroundDisplay | null): void {
  if (preview === display) return;
  preview = display;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The display options to draw with: the preview if any, else the saved. */
export function useBackgroundDisplay(): BackgroundDisplay {
  const saved = useSlice(backgroundDisplaySlice).value;
  const previewed = useSyncExternalStore(subscribe, () => preview);
  return previewed ?? saved;
}
