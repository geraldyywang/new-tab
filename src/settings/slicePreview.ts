/**
 * Unsaved previews of slice values, for settings that apply live while being
 * edited (themes, clock format). A section sets a preview from its draft and
 * clears it on save or discard; readers use `usePreviewedSlice` in place of
 * `useSlice` and see the preview while there is one.
 */
import {useSyncExternalStore} from 'react';
import {useSlice, type SettingsSlice, type SliceState} from './slices';

interface Preview {
  value: unknown;
}

const previews = new Map<SettingsSlice<unknown>, Preview>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows `value` in place of the slice's saved value until cleared. */
export function setSlicePreview<T>(slice: SettingsSlice<T>, value: T): void {
  previews.set(slice, {value});
  notify();
}

/** Goes back to the slice's saved value. */
export function clearSlicePreview<T>(slice: SettingsSlice<T>): void {
  if (previews.delete(slice)) notify();
}

/** Like `useSlice`, but returns the preview while one is set. */
export function usePreviewedSlice<T>(slice: SettingsSlice<T>): SliceState<T> {
  const saved = useSlice(slice);
  const preview = useSyncExternalStore(subscribe, () => previews.get(slice));
  // Only setSlicePreview stores values, typed by the same slice
  return preview ? {loaded: true, value: preview.value as T} : saved;
}
