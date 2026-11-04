import {useRef, useState, type ChangeEvent} from 'react';
import type {SettingsSectionProps} from '../../settings/sections';
import {listSettingsSlices} from '../../settings/sliceRegistry';
import {useReportDirty} from '../../settings/useSyncedDraft';
import {Button} from '../../ui/Button';
import * as ui from '../../ui/styles';
import {
  applyImport,
  backupFileName,
  BackupFileError,
  createBackup,
  describeImport,
  exportableSlices,
  planImport,
  readBackupFile,
  sliceLabel,
  type ImportPlan,
} from './backup';
import {downloadJson} from './download';

function plural(n: number) {
  return `${n} setting${n === 1 ? '' : 's'}`;
}

/** Settings section to export settings to a file and import them back. */
export function BackupSettings({title, onDirtyChange}: SettingsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ui.StatusMessage | null>(null);
  useReportDirty(plan !== null, onDirtyChange);

  const secretLabels = listSettingsSlices()
    .filter(slice => slice.area === 'sync' && slice.secret)
    .map(sliceLabel);

  async function handleExport() {
    const slices = exportableSlices(listSettingsSlices(), includeSecrets);
    const backup = await createBackup(slices);
    downloadJson(backupFileName(), backup);
    setStatus({tone: 'ok', text: `Exported ${plural(slices.length)}.`});
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Let the same file be picked again later
    e.target.value = '';
    if (!file) return;
    setPlan(null);
    try {
      const next = planImport(await readBackupFile(file), listSettingsSlices());
      if (next.entries.length > 0) {
        setPlan(next);
        setStatus(null);
      } else {
        setStatus({tone: 'error', text: describeImport(next, [])});
      }
    } catch (err) {
      const text =
        err instanceof BackupFileError ? err.message : 'Could not read file.';
      setStatus({tone: 'error', text});
    }
  }

  async function handleReplace(confirmed: ImportPlan) {
    setBusy(true);
    const failures = await applyImport(confirmed.entries);
    setBusy(false);
    setPlan(null);
    setStatus({
      tone: failures.length > 0 ? 'error' : 'ok',
      text: describeImport(confirmed, failures),
    });
  }

  return (
    <section aria-labelledby="settings-backup-title">
      <h3 id="settings-backup-title" className={ui.sectionTitleClass}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-fg-subtle">
        Save your synced settings to a file, or load them from one. Settings
        kept only on this computer, such as a background photo, aren't included.
      </p>

      {secretLabels.length > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeSecrets}
            onChange={e => setIncludeSecrets(e.target.checked)}
            className={`h-4 w-4 accent-accent ${ui.focusRingClass}`}
          />
          Include my {secretLabels.join(' and ')}
        </label>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => void handleExport()} disabled={busy}>
          Export…
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
          Import…
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Settings file to import"
          className="sr-only"
          tabIndex={-1}
          onChange={e => void handleFile(e)}
        />
      </div>

      {plan && (
        <div
          role="group"
          aria-labelledby="settings-import-confirm"
          className="mt-3 rounded-lg border border-border bg-surface-inset p-3 text-sm"
        >
          <p id="settings-import-confirm" className="font-bold text-fg">
            Replace {plural(plan.entries.length)}?
          </p>
          <p className="mt-1">
            {plan.entries.map(entry => sliceLabel(entry.slice)).join(', ')}
          </p>
          {plan.skipped.length > 0 && (
            <p className="mt-1 text-danger/90">
              Will skip {plural(plan.skipped.length)}:{' '}
              {plan.skipped.map(s => `${s.key} (${s.reason})`).join(', ')}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void handleReplace(plan)} disabled={busy}>
              {busy ? 'Replacing…' : 'Replace'}
            </Button>
            <Button onClick={() => setPlan(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 text-sm ${status ? ui.statusClass[status.tone] : ''}`}
      >
        {status?.text}
      </p>
    </section>
  );
}
