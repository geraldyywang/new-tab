/**
 * Every settings slice defined so far, so whole-settings features (export /
 * import) find new slices without a hand-maintained list.
 * `defineSettingsSlice` registers each slice when it is defined.
 */
import type {StorageArea} from './storageBackends';
import type {SettingsSlice} from './slices';

const registry = new Map<string, SettingsSlice<unknown>>();

function registryKey(area: StorageArea, key: string) {
  return `${area}/${key}`;
}

/**
 * Adds a slice to the registry. A later slice with the same area and key
 * replaces the earlier one (as when a module is hot-reloaded).
 */
export function registerSlice(slice: SettingsSlice<unknown>): void {
  registry.set(registryKey(slice.area, slice.key), slice);
}

/**
 * Every registered slice, in definition order. A slice is only registered
 * once its module has been imported; the settings dialog imports every
 * feature's sections, so all of them are by the time it opens.
 */
export function listSettingsSlices(): ReadonlyArray<SettingsSlice<unknown>> {
  return [...registry.values()];
}
