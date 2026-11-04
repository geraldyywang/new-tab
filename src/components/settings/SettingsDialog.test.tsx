import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {pressEscape} from '../../test/dialogPolyfill';
import SettingsDialog from './SettingsDialog';

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;

const renderOpenDialog = async () => {
  const onClose = vi.fn();
  render(<SettingsDialog open onClose={onClose} />);
  await screen.findByLabelText('WeatherAPI key');
  return onClose;
};

const makeDirty = () =>
  fireEvent.change(screen.getByLabelText('WeatherAPI key'), {
    target: {value: 'unsaved'},
  });

let confirmSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  confirmSpy = vi.fn();
  vi.stubGlobal('confirm', confirmSpy);
});

afterEach(() => window.localStorage.clear());

describe('SettingsDialog', () => {
  it('opens as a modal and closes without asking when clean', async () => {
    const onClose = await renderOpenDialog();
    expect(dialog().open).toBe(true);

    fireEvent.click(screen.getByRole('button', {name: 'Close settings'}));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before discarding edits and stays open on cancel', async () => {
    const onClose = await renderOpenDialog();
    makeDirty();

    confirmSpy.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', {name: 'Close settings'}));
    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(dialog().open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', {name: 'Close settings'}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents Esc from closing when the user keeps their edits', async () => {
    const onClose = await renderOpenDialog();
    makeDirty();

    confirmSpy.mockReturnValue(false);
    expect(pressEscape(dialog())).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    expect(pressEscape(dialog())).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles Esc keydown itself when there are unsaved edits', async () => {
    const onClose = await renderOpenDialog();
    makeDirty();
    const input = screen.getByLabelText('WeatherAPI key');

    // Cancelled: keydown is prevented so the browser never sends a close request
    confirmSpy.mockReturnValue(false);
    expect(fireEvent.keyDown(input, {key: 'Escape'})).toBe(false);
    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(dialog().open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    // Confirmed: the dialog closes itself
    confirmSpy.mockReturnValue(true);
    expect(fireEvent.keyDown(input, {key: 'Escape'})).toBe(false);
    expect(dialog().open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves Esc keydown to the browser when nothing is dirty', async () => {
    const onClose = await renderOpenDialog();
    expect(fireEvent.keyDown(dialog(), {key: 'Escape'})).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks on a backdrop click, but ignores clicks inside', async () => {
    const onClose = await renderOpenDialog();
    makeDirty();
    confirmSpy.mockReturnValue(false);

    fireEvent.pointerDown(screen.getByText('Settings'));
    fireEvent.click(screen.getByText('Settings'));
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog());
    fireEvent.click(dialog());
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
