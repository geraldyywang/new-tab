import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {TEST_PALETTE} from '../../test/photoFixtures';
import {publishPhotoBackdrop} from '../../theme/photoBackdrop';
import {SurfaceOptions} from './SurfaceOptions';
import {DEFAULT_THEME_SETTINGS, type ThemeSettings} from './themeSettings';

const GLASS: ThemeSettings = {...DEFAULT_THEME_SETTINGS, surface: 'glass'};

function withPhoto() {
  act(() =>
    publishPhotoBackdrop({
      loaded: true,
      backdrop: {palette: TEST_PALETTE, dim: 0.2},
    }),
  );
}

afterEach(() => {
  publishPhotoBackdrop({loaded: true, backdrop: null});
});

function renderOptions(value: ThemeSettings, onChange = vi.fn()) {
  render(<SurfaceOptions idPrefix="s" value={value} onChange={onChange} />);
  return onChange;
}

describe('SurfaceOptions', () => {
  it('reports the chosen style', () => {
    const onChange = renderOptions(DEFAULT_THEME_SETTINGS);
    fireEvent.click(screen.getByRole('radio', {name: 'Frosted'}));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_THEME_SETTINGS,
      surface: 'frosted',
    });
  });

  it('has no card opacity for solid surfaces', () => {
    withPhoto();
    renderOptions({...DEFAULT_THEME_SETTINGS, surface: 'solid'});
    expect(screen.queryByLabelText('Card opacity')).toBeNull();
  });

  it('shows card opacity for Auto only over a photo', () => {
    const {unmount} = render(
      <SurfaceOptions
        idPrefix="s"
        value={DEFAULT_THEME_SETTINGS}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Card opacity')).toBeNull();
    unmount();
    withPhoto();
    renderOptions(DEFAULT_THEME_SETTINGS);
    expect(screen.getByLabelText('Card opacity')).toBeTruthy();
  });

  it("shows Auto's opacity and leaves Auto when moved", () => {
    withPhoto();
    const onChange = renderOptions(GLASS);
    const slider = screen.getByLabelText<HTMLInputElement>('Card opacity');
    expect(screen.getByText(`${slider.value}% (Auto)`)).toBeTruthy();
    fireEvent.change(slider, {target: {value: '30'}});
    expect(onChange).toHaveBeenLastCalledWith({...GLASS, surfaceOpacity: 30});
  });

  it('goes back to Auto, and warns while text is hard to read', () => {
    withPhoto();
    const onChange = renderOptions({...GLASS, surfaceOpacity: 0});
    expect(
      screen.getByText('Text may be hard to read at this opacity.'),
    ).toBeTruthy();
    const auto = screen.getByRole<HTMLInputElement>('checkbox', {
      name: /Auto/,
    });
    expect(auto.checked).toBe(false);
    fireEvent.click(auto);
    expect(onChange).toHaveBeenLastCalledWith({...GLASS, surfaceOpacity: null});
  });
});
