/**
 * Settings export and import: every registered `sync` slice goes into one
 * JSON file, and an imported file is checked with each slice's `parse`.
 */
import {
  loadSlice,
  saveSlice,
  SettingsWriteError,
  type SettingsSlice,
} from '../../settings/slices';

type AnySlice = SettingsSlice<unknown>;

/** Marks a file as ours (`app` field). */
export const BACKUP_APP_ID = 'new-tab';

/** Largest settings file import will read. */
export const MAX_BACKUP_BYTES = 1024 * 1024;

/** The exported file's contents. */
export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  /** ISO 8601 time of the export. */
  exportedAt: string;
  /** Slice key to value. */
  settings: Record<string, unknown>;
}

/** A file that can't be imported at all; the message can be shown as is. */
export class BackupFileError extends Error {}

/** A valid setting from an imported file, ready to save. */
export interface ImportEntry {
  slice: AnySlice;
  value: unknown;
}

/** A setting in an imported file that won't be applied, and why. */
export interface SkippedSetting {
  key: string;
  reason: 'unknown setting' | 'invalid value';
}

/** What importing a file would do. */
export interface ImportPlan {
  entries: ImportEntry[];
  skipped: SkippedSetting[];
}

/** A setting that failed to save during import. */
export interface ImportFailure {
  slice: AnySlice;
  message: string;
}

/** The slice's name for people. */
export function sliceLabel(slice: AnySlice): string {
  return slice.label ?? slice.key;
}

/** Slices an export covers: `sync` ones, secret ones only if asked for. */
export function exportableSlices(
  slices: readonly AnySlice[],
  includeSecrets: boolean,
): AnySlice[] {
  return slices.filter(
    slice => slice.area === 'sync' && (includeSecrets || !slice.secret),
  );
}

/** Reads the current value of each slice into a backup file. */
export async function createBackup(
  slices: readonly AnySlice[],
  now = new Date(),
): Promise<BackupFile> {
  const values = await Promise.all(slices.map(slice => loadSlice(slice)));
  const settings = Object.fromEntries(
    slices.map((slice, i) => [slice.key, values[i]]),
  );
  return {app: BACKUP_APP_ID, exportedAt: now.toISOString(), settings};
}

/** Download name for a backup, e.g. `new-tab-settings-2026-11-04.json`. */
export function backupFileName(now = new Date()): string {
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map(n => String(n).padStart(2, '0'))
    .join('-');
  return `new-tab-settings-${date}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks a settings file against the `sync` slices (secret ones included):
 * unknown keys and values their slice's `parse` rejects are skipped.
 * Throws `BackupFileError` if the file isn't a settings file.
 */
export function planImport(
  text: string,
  slices: readonly AnySlice[],
): ImportPlan {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFileError("This file isn't valid JSON.");
  }
  if (
    !isRecord(data) ||
    data.app !== BACKUP_APP_ID ||
    !isRecord(data.settings)
  ) {
    throw new BackupFileError("This isn't a new_tab() settings file.");
  }
  const byKey = new Map(exportableSlices(slices, true).map(s => [s.key, s]));
  const plan: ImportPlan = {entries: [], skipped: []};
  for (const [key, raw] of Object.entries(data.settings)) {
    const slice = byKey.get(key);
    const value = slice ? slice.parse(raw) : null;
    if (!slice) plan.skipped.push({key, reason: 'unknown setting'});
    else if (value === null) plan.skipped.push({key, reason: 'invalid value'});
    else plan.entries.push({slice, value});
  }
  return plan;
}

/** Reads a chosen file's text; throws `BackupFileError` if it's too big. */
export async function readBackupFile(file: Blob): Promise<string> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new BackupFileError('This file is too big for a settings file.');
  }
  return file.text();
}

/** Saves each entry in turn; returns the ones that failed. */
export async function applyImport(
  entries: readonly ImportEntry[],
): Promise<ImportFailure[]> {
  const failures: ImportFailure[] = [];
  for (const {slice, value} of entries) {
    try {
      await saveSlice(slice, value);
    } catch (err) {
      const message =
        err instanceof SettingsWriteError ? err.message : 'Could not save.';
      failures.push({slice, message});
    }
  }
  return failures;
}

function countSettings(n: number) {
  return `${n} setting${n === 1 ? '' : 's'}`;
}

/** One-line summary of a finished import. */
export function describeImport(
  plan: ImportPlan,
  failures: readonly ImportFailure[],
): string {
  const parts = [
    `Imported ${countSettings(plan.entries.length - failures.length)}.`,
  ];
  if (plan.skipped.length > 0) {
    const list = plan.skipped.map(s => `${s.key} (${s.reason})`).join(', ');
    parts.push(`Skipped ${plan.skipped.length}: ${list}.`);
  }
  for (const {slice, message} of failures) {
    parts.push(`${sliceLabel(slice)} not saved: ${message}`);
  }
  return parts.join(' ');
}
