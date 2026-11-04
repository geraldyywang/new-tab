import {afterEach, describe, expect, it} from 'vitest';
import {defineSettingsSlice, loadSlice} from '../../settings/slices';
import {
  applyImport,
  backupFileName,
  BackupFileError,
  createBackup,
  describeImport,
  exportableSlices,
  MAX_BACKUP_BYTES,
  planImport,
  readBackupFile,
} from './backup';

function parseString(data: unknown) {
  return typeof data === 'string' ? data : null;
}

function parseCount(data: unknown) {
  return typeof data === 'number' && Number.isInteger(data) ? data : null;
}

const name = defineSettingsSlice({
  key: 'test.name',
  area: 'sync',
  parse: parseString,
  default: 'nobody',
  label: 'Name',
});
const count = defineSettingsSlice({
  key: 'test.count',
  area: 'sync',
  parse: parseCount,
  default: 0,
});
const token = defineSettingsSlice({
  key: 'test.token',
  area: 'sync',
  parse: parseString,
  default: '',
  secret: true,
});
const deviceOnly = defineSettingsSlice({
  key: 'test.device',
  area: 'local',
  parse: parseString,
  default: '',
});
const ALL = [name, count, token, deviceOnly];

function file(settings: Record<string, unknown>) {
  return JSON.stringify({app: 'new-tab', exportedAt: 'x', settings});
}

afterEach(() => window.localStorage.clear());

describe('exportableSlices', () => {
  it('keeps sync slices and leaves secrets out unless asked', () => {
    expect(exportableSlices(ALL, false)).toEqual([name, count]);
    expect(exportableSlices(ALL, true)).toEqual([name, count, token]);
  });
});

describe('createBackup', () => {
  it('writes each slice value, stored or default', async () => {
    window.localStorage.setItem('new-tab:test.count', '7');
    const now = new Date('2026-11-04T10:00:00Z');
    expect(await createBackup([name, count], now)).toEqual({
      app: 'new-tab',
      exportedAt: '2026-11-04T10:00:00.000Z',
      settings: {'test.name': 'nobody', 'test.count': 7},
    });
  });
});

describe('backupFileName', () => {
  it('uses the local date', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe(
      'new-tab-settings-2026-01-05.json',
    );
  });
});

describe('planImport', () => {
  it('accepts valid values and skips unknown keys and invalid values', () => {
    const plan = planImport(
      file({
        'test.name': 'Ada',
        'test.count': 'three',
        'test.token': 'secret-value',
        'test.device': 'nope',
        'old.key': 1,
      }),
      ALL,
    );
    expect(plan.entries).toEqual([
      {slice: name, value: 'Ada'},
      {slice: token, value: 'secret-value'},
    ]);
    expect(plan.skipped).toEqual([
      {key: 'test.count', reason: 'invalid value'},
      {key: 'test.device', reason: 'unknown setting'},
      {key: 'old.key', reason: 'unknown setting'},
    ]);
  });

  it.each([
    ['not json', /valid JSON/],
    ['[]', /settings file/],
    ['{"app":"other","settings":{}}', /settings file/],
    ['{"app":"new-tab","settings":[]}', /settings file/],
    ['{"app":"new-tab"}', /settings file/],
  ])('rejects %j', (text, message) => {
    expect(() => planImport(text, ALL)).toThrow(BackupFileError);
    expect(() => planImport(text, ALL)).toThrow(message);
  });
});

describe('readBackupFile', () => {
  it('reads small files and refuses big ones', async () => {
    expect(await readBackupFile(new Blob(['{"a":1}']))).toBe('{"a":1}');
    const big = new Blob(['x'.repeat(MAX_BACKUP_BYTES + 1)]);
    await expect(readBackupFile(big)).rejects.toThrow(BackupFileError);
  });
});

describe('applyImport', () => {
  it('saves every entry and reports the ones that fail', async () => {
    // Sync items over 8 KB are refused before writing
    const failures = await applyImport([
      {slice: name, value: 'x'.repeat(9000)},
      {slice: count, value: 3},
    ]);
    expect(await loadSlice(count)).toBe(3);
    expect(await loadSlice(name)).toBe('nobody');
    expect(failures).toEqual([
      {slice: name, message: expect.stringMatching(/too much data/)},
    ]);
  });
});

describe('describeImport', () => {
  it('summarises applied, skipped and failed settings', () => {
    const plan = {
      entries: [
        {slice: name, value: 'Ada'},
        {slice: count, value: 1},
      ],
      skipped: [{key: 'old.key', reason: 'unknown setting' as const}],
    };
    expect(describeImport(plan, [])).toBe(
      'Imported 2 settings. Skipped 1: old.key (unknown setting).',
    );
    expect(describeImport(plan, [{slice: name, message: 'Full.'}])).toBe(
      'Imported 1 setting. Skipped 1: old.key (unknown setting). Name not saved: Full.',
    );
  });
});
