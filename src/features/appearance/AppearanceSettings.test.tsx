import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useState} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SettingsDialog} from '../../settings/SettingsDialog';
import {getSliceState, resetSlice} from '../../settings/slices';
import {publishPhotoBackdrop} from '../../theme/photoBackdrop';
import {Clock} from '../clock/Clock';
import {clockSlice} from '../clock/settings';
import {appearanceSettingsSection} from './settingsSection';
import {themeSlice} from './themeSettings';
import {ThemeSync} from './ThemeSync';

const root = document.documentElement;
let confirmSpy: ReturnType<typeof vi.fn>;

// Like App: closing the dialog unmounts its sections
function Page({onClose}: {onClose: () => void}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Clock />
      <ThemeSync />
      <SettingsDialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        sections={[appearanceSettingsSection]}
      />
    </>
  );
}

async function openPage() {
  const onClose = vi.fn();
  render(<Page onClose={onClose} />);
  await screen.findByRole('radio', {name: 'Nord'});
  return onClose;
}

function clockText() {
  return document.querySelector('p.text-7xl')?.textContent ?? '';
}

beforeEach(() => {
  publishPhotoBackdrop({loaded: true, backdrop: null});
  confirmSpy = vi.fn();
  vi.stubGlobal('confirm', confirmSpy);
});

afterEach(async () => {
  await act(async () => {
    await resetSlice(themeSlice);
    await resetSlice(clockSlice);
  });
  window.localStorage.clear();
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-surface-style');
});

describe('AppearanceSettings', () => {
  it('starts on the unchanged default theme', async () => {
    await openPage();
    expect(
      screen.getByRole<HTMLInputElement>('radio', {name: 'Stone'}).checked,
    ).toBe(true);
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('previews a theme and clock change live, then saves them', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('radio', {name: 'Nord'}));
    fireEvent.click(screen.getByRole('radio', {name: '24-hour'}));
    expect(root.dataset.theme).toBe('nord');
    expect(clockText()).not.toMatch(/[AP]M/);
    expect(getSliceState(themeSlice).value.preset).toBe('stone');

    fireEvent.click(screen.getByRole('button', {name: 'Save'}));
    await screen.findByText('Saved.');
    expect(getSliceState(themeSlice).value.preset).toBe('nord');
    expect(getSliceState(clockSlice).value.hour12).toBe(false);
    expect(root.dataset.theme).toBe('nord');
  });

  it('previews and saves the surface style', async () => {
    await openPage();
    expect(
      screen.getByText('Opaque cards in the theme’s colours.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', {name: 'Liquid glass'}));
    expect(root.dataset.surfaceStyle).toBe('glass');
    expect(
      screen.getByText('Frosted cards whose edges catch the light.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Save'}));
    await screen.findByText('Saved.');
    expect(getSliceState(themeSlice).value.surface).toBe('glass');
    fireEvent.click(screen.getByRole('radio', {name: 'Solid'}));
    expect(root.hasAttribute('data-surface-style')).toBe(false);
  });

  it('reverts the preview when unsaved changes are discarded', async () => {
    const onClose = await openPage();
    fireEvent.click(screen.getByRole('radio', {name: 'Light'}));
    fireEvent.click(screen.getByRole('radio', {name: 'Teal'}));
    expect(root.dataset.theme).toBe('light');

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', {name: 'Close settings'}));
    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(root.hasAttribute('data-theme')).toBe(false));
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('restores defaults as a draft', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('radio', {name: 'Dracula'}));
    fireEvent.click(screen.getByRole('button', {name: 'Save'}));
    await screen.findByText('Saved.');

    fireEvent.click(screen.getByRole('button', {name: 'Reset to defaults'}));
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(getSliceState(themeSlice).value.preset).toBe('dracula');
  });
});
