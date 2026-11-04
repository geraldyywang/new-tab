import {Button} from '../ui/Button';

/** Shown when a section's saved value changed elsewhere during editing. */
export function ConflictNotice({onReload}: {onReload: () => void}) {
  return (
    <div
      role="status"
      className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-sm text-warning-fg/80"
    >
      <p>Changed on another device — Reload to see the latest</p>
      <Button onClick={onReload}>Reload</Button>
    </div>
  );
}
