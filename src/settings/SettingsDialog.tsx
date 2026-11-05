import {useEffect, useMemo, useRef, useState} from 'react';
import {FiX} from 'react-icons/fi';
import {SETTINGS_SECTIONS, type SettingsSection} from './sections';
import {useSlicesLoaded} from './useSlicesLoaded';
import {IconButton} from '../ui/Button';
import {surfaceAttributes} from '../ui/styles';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Sections to show, already sorted; defaults to the registry. */
  sections?: readonly SettingsSection[];
}

/** Modal settings dialog. Asks before discarding unsaved edits on close. */
export function SettingsDialog({
  open,
  onClose,
  sections = SETTINGS_SECTIONS,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pointerDownOnBackdrop = useRef(false);
  const slices = useMemo(() => sections.flatMap(s => s.slices), [sections]);
  const loaded = useSlicesLoaded(slices);

  // Ids of sections with unsaved edits, plus stable per-section callbacks
  // for useReportDirty. Only read in event handlers, so not React state.
  const [dirty] = useState(() => {
    const sections = new Set<string>();
    const reporters = new Map<string, (isDirty: boolean) => void>();
    function report(id: string) {
      let reporter = reporters.get(id);
      if (!reporter) {
        reporter = isDirty => {
          if (isDirty) sections.add(id);
          else sections.delete(id);
        };
        reporters.set(id, reporter);
      }
      return reporter;
    }
    return {sections, report};
  });

  // Sync the native dialog with the `open` prop (no React state set here)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function confirmDiscard() {
    return (
      dirty.sections.size === 0 || window.confirm('Discard unsaved changes?')
    );
  }

  // Close button and backdrop click
  function requestClose() {
    if (confirmDiscard()) dialogRef.current?.close();
  }

  function handleClose() {
    // Sections unmount once closed; don't let stale flags outlive them
    dirty.sections.clear();
    onClose();
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-title"
      // Chrome may skip `cancel` (or make it non-cancelable) on repeated Esc,
      // so with unsaved edits handle Esc here: a canceled keydown never
      // becomes a close request
      onKeyDown={e => {
        if (e.key !== 'Escape' || dirty.sections.size === 0) return;
        e.preventDefault();
        requestClose();
      }}
      // Fallback for other close requests; keep the dialog open if asked to
      onCancel={e => {
        if (!confirmDiscard()) e.preventDefault();
      }}
      onClose={handleClose}
      // Close on backdrop click, but not when a text selection drag ends there
      onPointerDown={e => {
        pointerDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={e => {
        if (pointerDownOnBackdrop.current && e.target === e.currentTarget) {
          requestClose();
        }
        pointerDownOnBackdrop.current = false;
      }}
      {...surfaceAttributes(
        'overlay',
        // The content scrolls, not the dialog, so a surface's rim and sheen
        // stay at the dialog's edge and switching surface style mid-scroll
        // can't strand the content out of view
        'm-auto max-h-[calc(100vh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-hidden p-0 text-fg-muted shadow-2xl backdrop:bg-scrim',
      )}
    >
      {open && (
        // `relative` keeps absolutely positioned descendants (sr-only inputs)
        // inside the scroller; otherwise they stretch the dialog, and focusing
        // one scrolls it
        <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto p-6 [scrollbar-color:var(--color-border)_transparent]">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="settings-title"
              className="text-2xl font-bold text-fg-subtle"
            >
              Settings
            </h2>
            <IconButton
              onClick={requestClose}
              aria-label="Close settings"
              title="Close"
              className="text-xl"
            >
              <FiX aria-hidden="true" />
            </IconButton>
          </div>

          {loaded ? (
            <div className="mt-4 flex flex-col gap-8">
              {sections.map(section => (
                <section.Component
                  key={section.id}
                  title={section.title}
                  onDirtyChange={dirty.report(section.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-fg-subtle">Loading settings…</p>
          )}
        </div>
      )}
    </dialog>
  );
}
