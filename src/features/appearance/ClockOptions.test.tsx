import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DEFAULT_CLOCK_SETTINGS} from '../clock/settings';
import {ClockOptions} from './ClockOptions';

describe('ClockOptions', () => {
  it('changes each option', () => {
    const onChange = vi.fn();
    render(
      <ClockOptions
        idPrefix="c"
        value={DEFAULT_CLOCK_SETTINGS}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Font'), {target: {value: 'mono'}});
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CLOCK_SETTINGS,
      font: 'mono',
    });
    fireEvent.change(screen.getByLabelText('Date'), {target: {value: 'iso'}});
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({dateFormat: 'iso'}),
    );
    fireEvent.click(screen.getByRole('radio', {name: '24-hour'}));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({hour12: false}),
    );
    fireEvent.click(screen.getByRole('checkbox', {name: 'Show seconds'}));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({showSeconds: false}),
    );
  });

  it('shows a sample in the chosen font', () => {
    render(
      <ClockOptions
        idPrefix="c"
        value={{...DEFAULT_CLOCK_SETTINGS, font: 'serif', dateFormat: 'none'}}
        onChange={vi.fn()}
      />,
    );
    const sample = screen.getByText(/\d:\d\d:\d\d/);
    expect(sample.style.fontFamily).toContain('Georgia');
  });
});
