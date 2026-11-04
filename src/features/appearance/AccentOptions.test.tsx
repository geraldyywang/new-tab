import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {AccentOptions} from './AccentOptions';
import {presetById} from './presets';

describe('AccentOptions', () => {
  it('picks a swatch, a custom colour and resets', () => {
    const onChange = vi.fn();
    const {rerender} = render(
      <AccentOptions
        idPrefix="a"
        onChange={onChange}
        presets={[presetById('stone')]}
      />,
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Reset to theme default',
      }).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('radio', {name: 'Teal'}));
    expect(onChange).toHaveBeenLastCalledWith('#2dd4bf');
    fireEvent.input(screen.getByLabelText('Custom'), {
      target: {value: '#ABCDEF'},
    });
    expect(onChange).toHaveBeenLastCalledWith('#abcdef');

    rerender(
      <AccentOptions
        idPrefix="a"
        value="#abcdef"
        onChange={onChange}
        presets={[presetById('stone')]}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', {name: 'Reset to theme default'}),
    );
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('warns when the accent is adjusted on a theme', () => {
    render(
      <AccentOptions
        idPrefix="a"
        value="#fbbf24"
        onChange={vi.fn()}
        presets={[presetById('light'), presetById('nord')]}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'Hard to see on Light,',
    );
  });
});
