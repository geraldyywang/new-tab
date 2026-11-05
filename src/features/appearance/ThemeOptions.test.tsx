import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ThemeOptions} from './ThemeOptions';
import {DEFAULT_THEME_SETTINGS, type ThemeSettings} from './themeSettings';

function Harness({onChange}: {onChange: (value: ThemeSettings) => void}) {
  const [value, setValue] = useState(DEFAULT_THEME_SETTINGS);
  return (
    <ThemeOptions
      idPrefix="t"
      value={value}
      onChange={next => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('ThemeOptions', () => {
  it('picks a fixed preset', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(
      screen.getByRole<HTMLInputElement>('radio', {name: 'Stone'}).checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole('radio', {name: 'Nord'}));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({mode: 'fixed', preset: 'nord'}),
    );
  });

  it('edits the light and dark themes and the schedule', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', {name: 'Scheduled'}));
    fireEvent.change(screen.getByLabelText('Dark theme'), {
      target: {value: 'dracula'},
    });
    fireEvent.change(screen.getByLabelText('Light from'), {
      target: {value: '06:30'},
    });
    fireEvent.change(screen.getByLabelText('Until'), {
      target: {value: '01:15'},
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'scheduled',
        darkPreset: 'dracula',
        lightFrom: 6 * 60 + 30,
        lightUntil: 75,
      }),
    );
  });

  it('hides the schedule outside scheduled mode', () => {
    render(<Harness onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', {name: 'Match system'}));
    expect(screen.getByLabelText('Light theme')).toBeTruthy();
    expect(screen.queryByLabelText('Light from')).toBeNull();
  });
});
