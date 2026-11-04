import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DisplayControls} from './DisplayControls';
import {DEFAULT_BACKGROUND_DISPLAY} from './settings';

describe('DisplayControls', () => {
  it('reports each change as a full set of options', () => {
    const onChange = vi.fn();
    render(
      <DisplayControls
        value={DEFAULT_BACKGROUND_DISPLAY}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Focus left–right'), {
      target: {value: '25'},
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_BACKGROUND_DISPLAY,
      focusX: 25,
    });
    fireEvent.click(screen.getByLabelText('Fit (letterbox)'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_BACKGROUND_DISPLAY,
      fit: 'contain',
    });
  });

  it('limits dim and blur and shows their values', () => {
    render(
      <DisplayControls
        value={{...DEFAULT_BACKGROUND_DISPLAY, dim: 35, blur: 6}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('Dim').getAttribute('max')).toBe('80');
    expect(screen.getByLabelText('Blur').getAttribute('max')).toBe('20');
    expect(screen.getByText('35%')).toBeTruthy();
    expect(screen.getByText('6 px')).toBeTruthy();
  });

  it('can be disabled', () => {
    render(
      <DisplayControls
        value={DEFAULT_BACKGROUND_DISPLAY}
        onChange={() => {}}
        disabled
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>('Dim').disabled).toBe(true);
    // Disabled through its fieldset, which the property doesn't reflect
    expect(screen.getByLabelText('Fill (crop)').matches(':disabled')).toBe(
      true,
    );
  });
});
