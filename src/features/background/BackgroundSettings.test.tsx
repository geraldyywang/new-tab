import 'fake-indexeddb/auto';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BackgroundSettings} from './BackgroundSettings';
import {useBackgroundDisplay} from './displayPreview';
import {resetSlice} from '../../settings/slices';
import {backgroundDisplaySlice, type BackgroundDisplay} from './settings';

afterEach(() => resetSlice(backgroundDisplaySlice));

/** Shows what the page would draw with. */
function DisplayProbe() {
  return (
    <output data-testid="shown">
      {JSON.stringify(useBackgroundDisplay())}
    </output>
  );
}

function shown(): BackgroundDisplay {
  // Written by DisplayProbe from a BackgroundDisplay
  return JSON.parse(
    screen.getByTestId('shown').textContent ?? '',
  ) as BackgroundDisplay;
}

function renderSection() {
  const onDirtyChange = vi.fn();
  const utils = render(
    <>
      <DisplayProbe />
      <BackgroundSettings title="Background" onDirtyChange={onDirtyChange} />
    </>,
  );
  return {...utils, onDirtyChange};
}

function slider(name: string) {
  return screen.getByLabelText<HTMLInputElement>(name);
}

describe('BackgroundSettings', () => {
  it('says the photo is local only', () => {
    renderSection();
    expect(
      screen.getByText(/Your photo stays on this computer and isn’t synced\./),
    ).toBeTruthy();
    expect(screen.getByRole('heading', {name: 'Background'})).toBeTruthy();
  });

  it('previews edits on the page and reports them as unsaved', () => {
    const {onDirtyChange} = renderSection();
    fireEvent.change(slider('Dim'), {target: {value: '55'}});
    fireEvent.click(screen.getByLabelText('Fit (letterbox)'));
    expect(shown()).toMatchObject({dim: 55, fit: 'contain'});
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(localStorage.getItem('new-tab:background.display')).toBeNull();
  });

  it('saves the options on Save', async () => {
    renderSection();
    fireEvent.change(slider('Blur'), {target: {value: '10'}});
    fireEvent.change(slider('Focus top–bottom'), {target: {value: '30'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save'}));
    await screen.findByText('Saved.');
    expect(
      JSON.parse(localStorage.getItem('new-tab:background.display') ?? ''),
    ).toEqual({
      fit: 'cover',
      focusX: 50,
      focusY: 30,
      dim: 20,
      blur: 10,
      paneOpacity: null,
    });
    expect(shown()).toMatchObject({blur: 10, focusY: 30});
  });

  it('drops the preview when closed without saving', () => {
    const {unmount} = renderSection();
    fireEvent.change(slider('Blur'), {target: {value: '12'}});
    expect(shown().blur).toBe(12);
    unmount();
    render(<DisplayProbe />);
    expect(shown().blur).toBe(0);
  });

  it('restores defaults as an unsaved edit', () => {
    renderSection();
    const reset = screen.getByRole('button', {name: 'Reset to defaults'});
    expect((reset as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(slider('Dim'), {target: {value: '70'}});
    fireEvent.click(reset);
    expect(slider('Dim').value).toBe('20');
    expect(screen.getByText('Defaults restored — Save to apply.')).toBeTruthy();
  });
});
