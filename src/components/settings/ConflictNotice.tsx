import {buttonClass} from '../ui/styles';

/** Shown when a section's saved value changed elsewhere during editing. */
export function ConflictNotice({onReload}: {onReload: () => void}) {
  return (
    <div
      role="status"
      className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-200/80"
    >
      <p>Changed on another device — Reload to see the latest</p>
      <button type="button" onClick={onReload} className={buttonClass}>
        Reload
      </button>
    </div>
  );
}
