import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import { useSettings } from "../../lib/storage";
import { iconButtonClass } from "../ui/styles";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pointerDownOnBackdrop = useRef(false);
  // Ids of sections with unsaved edits
  const dirtySectionsRef = useRef(new Set<string>());
  const settings = useSettings();

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

  const confirmDiscard = () =>
    dirtySectionsRef.current.size === 0 ||
    window.confirm("Discard unsaved changes?");

  // Close button and backdrop click
  const requestClose = () => {
    if (confirmDiscard()) dialogRef.current?.close();
  };

  const handleClose = () => {
    dirtySectionsRef.current.clear();
    onClose();
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-title"
      // Esc fires `cancel` before `close`; keep the dialog open if asked to
      onCancel={(e) => {
        if (!confirmDiscard()) e.preventDefault();
      }}
      onClose={handleClose}
      // Close on backdrop click, but not when a text selection drag ends there
      onPointerDown={(e) => {
        pointerDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
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
            <div className="mt-4 flex flex-col gap-8"></div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Loading settings…</p>
          )}
        </div>
      )}
    </dialog>
  );
};

export default SettingsDialog;
