import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {defineSettingsSlice, loadSlice} from '../../settings/slices';
import {BackupSettings} from './BackupSettings';

const greeting = defineSettingsSlice({
  key: 'test.greeting',
  area: 'sync',
  parse: (data: unknown) => (typeof data === 'string' ? data : null),
  default: 'hi',
  label: 'Greeting',
});
defineSettingsSlice({
  key: 'test.apiKey',
  area: 'sync',
  parse: (data: unknown) => (typeof data === 'string' ? data : null),
  default: 'k-123',
  label: 'Test API key',
  secret: true,
});
defineSettingsSlice({
  key: 'test.local',
  area: 'local',
  parse: () => 'x',
  default: 'x',
});

let blobs: Blob[];

beforeEach(() => {
  blobs = [];
  URL.createObjectURL = (blob: Blob) => {
    blobs.push(blob);
    return 'blob:test';
  };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => window.localStorage.clear());

function renderSection(onDirtyChange = vi.fn()) {
  render(
    <BackupSettings title="Import and export" onDirtyChange={onDirtyChange} />,
  );
  return onDirtyChange;
}

async function exportedSettings() {
  await vi.waitFor(() => expect(blobs).toHaveLength(1));
  const data = JSON.parse(await blobs[0].text()) as {settings: object};
  return data.settings;
}

function chooseFile(settings: Record<string, unknown>) {
  const text = JSON.stringify({app: 'new-tab', exportedAt: 'x', settings});
  fireEvent.change(screen.getByLabelText('Settings file to import'), {
    target: {files: [new File([text], 'backup.json')]},
  });
}

describe('BackupSettings', () => {
  it('exports sync settings, leaving secrets out by default', async () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', {name: 'Export…'}));
    const settings = await exportedSettings();
    expect(Object.keys(settings)).toEqual(['test.greeting']);
    expect(screen.getByRole('status')).toHaveProperty(
      'textContent',
      'Exported 1 setting.',
    );
  });

  it('includes secrets when the checkbox is ticked', async () => {
    renderSection();
    fireEvent.click(screen.getByLabelText('Include my Test API key'));
    fireEvent.click(screen.getByRole('button', {name: 'Export…'}));
    expect(await exportedSettings()).toEqual({
      'test.greeting': 'hi',
      'test.apiKey': 'k-123',
    });
  });

  it('confirms, then applies valid settings and reports skipped ones', async () => {
    const onDirtyChange = renderSection();
    chooseFile({'test.greeting': 'hello', 'test.apiKey': 5, 'gone.key': 1});

    await screen.findByText('Replace 1 setting?');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText(/Will skip 2 settings/).textContent).toBe(
      'Will skip 2 settings: test.apiKey (invalid value), gone.key (unknown setting)',
    );

    fireEvent.click(screen.getByRole('button', {name: 'Replace'}));
    await vi.waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        'Imported 1 setting. Skipped 2: test.apiKey (invalid value), gone.key (unknown setting).',
      ),
    );
    expect(await loadSlice(greeting)).toBe('hello');
    expect(screen.queryByText(/Replace 1 setting/)).toBeNull();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('changes nothing when cancelled', async () => {
    renderSection();
    chooseFile({'test.greeting': 'hello'});
    fireEvent.click(await screen.findByRole('button', {name: 'Cancel'}));
    expect(screen.queryByText(/Replace/)).toBeNull();
    expect(await loadSlice(greeting)).toBe('hi');
  });

  it('reports a file that is not a settings file', async () => {
    renderSection();
    fireEvent.change(screen.getByLabelText('Settings file to import'), {
      target: {files: [new File(['{oops'], 'x.json')]},
    });
    await vi.waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        "This file isn't valid JSON.",
      ),
    );
  });
});
