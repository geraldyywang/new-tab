import {useEffect, useRef, useState} from 'react';
import {FiX} from 'react-icons/fi';
import {
  DEFAULT_SIDEBAR_LINKS,
  DEFAULT_SOCIAL_LINKS,
} from '../features/links/links';
import {sliceBackendKind, useSlice} from './slices';
import {weatherApiKeySlice} from '../features/weather/settings';
import {
  saveLinkList,
  sidebarLinksSlice,
  socialLinksSlice,
} from '../features/links/settings';
import {IconButton} from '../ui/Button';
import {surfaceAttributes} from '../ui/styles';
import {ApiKeySection} from '../features/weather/ApiKeySection';
import {LinksEditor} from '../features/links/LinksEditor';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Modal settings dialog. Asks before discarding unsaved edits on close. */
export function SettingsDialog({open, onClose}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pointerDownOnBackdrop = useRef(false);
  const apiKey = useSlice(weatherApiKeySlice);
  const sidebarLinks = useSlice(sidebarLinksSlice);
  const socialLinks = useSlice(socialLinksSlice);

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
      {...surfaceAttributes(
        'solid',
        'm-auto max-h-[calc(100vh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto p-0 text-fg-muted shadow-2xl backdrop:bg-scrim [scrollbar-color:var(--color-border)_transparent]',
      )}
    >
      {open && (
        <div className="p-6">
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

          {apiKey.loaded && sidebarLinks.loaded && socialLinks.loaded ? (
            <div className="mt-4 flex flex-col gap-8">
              <ApiKeySection
                savedKey={apiKey.value}
                backend={sliceBackendKind(weatherApiKeySlice)}
                onDirtyChange={dirty.report.apiKey}
              />
              <LinksEditor
                title="Sidebar links"
                description="Shown in the bar on the right."
                links={sidebarLinks.value}
                defaults={DEFAULT_SIDEBAR_LINKS}
                onSave={links => saveLinkList(sidebarLinksSlice, links)}
                onDirtyChange={dirty.report.sidebarLinks}
              />
              <LinksEditor
                title="Social links"
                description="Shown in the bar at the bottom left."
                links={socialLinks.value}
                defaults={DEFAULT_SOCIAL_LINKS}
                onSave={links => saveLinkList(socialLinksSlice, links)}
                onDirtyChange={dirty.report.socialLinks}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-fg-subtle">Loading settings…</p>
          )}
        </div>
      )}
    </dialog>
  );
}
