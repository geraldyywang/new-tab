import {useCallback, useSyncExternalStore} from 'react';
import {getSliceState, subscribeSlice, type SettingsSlice} from './slices';

/**
 * Whether every slice in `slices` has finished its first read. Pass a stable
 * array (e.g. a module constant or a memoised value).
 */
export function useSlicesLoaded(
  slices: ReadonlyArray<SettingsSlice<unknown>>,
): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribers = slices.map(slice =>
        subscribeSlice(slice, listener),
      );
      return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    },
    [slices],
  );
  return useSyncExternalStore(subscribe, () =>
    slices.every(slice => getSliceState(slice).loaded),
  );
}
