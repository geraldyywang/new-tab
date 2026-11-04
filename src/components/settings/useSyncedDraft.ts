import {useEffect, useState, type Dispatch, type SetStateAction} from 'react';

/** State returned by `useSyncedDraft`. */
export interface SyncedDraft<T> {
  draft: T;
  setDraft: Dispatch<SetStateAction<T>>;
  /** The draft differs from the saved value. */
  dirty: boolean;
  /** The saved value changed elsewhere while the draft had unsaved edits. */
  conflict: boolean;
  /** Discards the draft and loads the latest saved value. */
  reload: () => void;
}

/**
 * Local editable copy of a saved (synced) value. When the saved value changes
 * from outside, a clean draft adopts it; a dirty draft is kept and `conflict`
 * is raised instead.
 */
export function useSyncedDraft<T>(
  saved: T,
  equals: (a: T, b: T) => boolean = Object.is,
): SyncedDraft<T> {
  const [draft, setDraft] = useState(saved);
  // The saved value the draft was last reconciled with
  const [base, setBase] = useState(saved);
  const [conflict, setConflict] = useState(false);

  // Adjust state during render when the saved value changes (no effect)
  if (!equals(saved, base)) {
    setBase(saved);
    if (equals(draft, base) || equals(draft, saved)) {
      setDraft(saved);
      setConflict(false);
    } else {
      setConflict(true);
    }
  }

  const dirty = !equals(draft, saved);

  return {
    draft,
    setDraft,
    dirty,
    conflict: conflict && dirty,
    reload: () => {
      setDraft(saved);
      setConflict(false);
    },
  };
}

/** Tells a parent whether a section has unsaved edits (false on unmount). */
export function useReportDirty(
  dirty: boolean,
  onDirtyChange: ((dirty: boolean) => void) | undefined,
) {
  useEffect(() => {
    if (!onDirtyChange) return;
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
}
