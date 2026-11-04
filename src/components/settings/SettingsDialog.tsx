import {useEffect, useRef, useState} from 'react';
import {FiX} from 'react-icons/fi';
import {DEFAULT_SIDEBAR_LINKS, DEFAULT_SOCIAL_LINKS} from '../../lib/links';
import {saveLinks, useSettings} from '../../lib/storage';
import {iconButtonClass} from '../ui/styles';
import {ApiKeySection} from './ApiKeySection';
import {LinksEditor} from './LinksEditor';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({open, onClose}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pointerDownOnBackdrop = useRef(false);
  const settings = useSettings();

  // Ids of sections with unsaved edits, plus stable per-section callbacks
  // for useReportDirty. Only read in event handlers, so not React state.
  const [dirty] = useState(() => {
    const sections = new Set<string>();
    function reporter(id: string) {
      return (isDirty: boolean) => {
        if (isDirty) sections.add(id);
        else sections.delete(id);
      };
    }
    return {
      sections,
      report: {
        apiKey: reporter('apiKey'),
        sidebarLinks: reporter('sidebarLinks'),
        socialLinks: reporter('socialLinks'),
      },
    };
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
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-neutral-900 p-0 text-neutral-400 shadow-2xl backdrop:bg-black/60 [scrollbar-color:var(--color-neutral-700)_transparent]"
    >
      {open && (
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="settings-title"
              className="text-2xl font-bold text-neutral-500"
            >
              Settings
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close settings"
              title="Close"
              className={`${iconButtonClass} text-xl`}
            >
              <FiX aria-hidden="true" />
            </button>
          </div>

          {settings.loaded ? (
            <div className="mt-4 flex flex-col gap-8">
              <ApiKeySection
                savedKey={settings.weatherApiKey}
                backend={settings.backend}
                onDirtyChange={dirty.report.apiKey}
              />
              <LinksEditor
                title="Sidebar links"
                description="Shown in the bar on the right."
                links={settings.sidebarLinks}
                defaults={DEFAULT_SIDEBAR_LINKS}
                onSave={links => saveLinks('sidebarLinks', links)}
                onDirtyChange={dirty.report.sidebarLinks}
              />
              <LinksEditor
                title="Social links"
                description="Shown in the bar at the bottom left."
                links={settings.socialLinks}
                defaults={DEFAULT_SOCIAL_LINKS}
                onSave={links => saveLinks('socialLinks', links)}
                onDirtyChange={dirty.report.socialLinks}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Loading settings…</p>
          )}
        </div>
      )}
    </dialog>
  );
}
