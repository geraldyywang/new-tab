import {describe, expect, it} from 'vitest';
import {itemBytes, QUOTA_BYTES_PER_ITEM} from '../../settings/quota';
import {
  backgroundDisplaySlice,
  DEFAULT_BACKGROUND_DISPLAY,
  displayEquals,
  parseBackgroundDisplay,
  type BackgroundDisplay,
} from './settings';

describe('parseBackgroundDisplay', () => {
  it('accepts valid options', () => {
    const value = {
      fit: 'contain',
      focusX: 10,
      focusY: 90,
      dim: 40,
      blur: 8,
      paneOpacity: 30,
    };
    expect(parseBackgroundDisplay(value)).toEqual(value);
  });

  it('reads a missing or null pane opacity as Auto', () => {
    const rest: Partial<BackgroundDisplay> = {...DEFAULT_BACKGROUND_DISPLAY};
    delete rest.paneOpacity;
    expect(parseBackgroundDisplay(rest)?.paneOpacity).toBeNull();
    expect(
      parseBackgroundDisplay({...rest, paneOpacity: null})?.paneOpacity,
    ).toBeNull();
  });

  it('clamps and rounds numbers into range', () => {
    expect(
      parseBackgroundDisplay({
        fit: 'cover',
        focusX: -5,
        focusY: 150,
        dim: 95,
        blur: 4.6,
        paneOpacity: 140,
      }),
    ).toEqual({
      fit: 'cover',
      focusX: 0,
      focusY: 100,
      dim: 80,
      blur: 5,
      paneOpacity: 100,
    });
  });

  it.each([
    ['null', null],
    ['a string', 'cover'],
    ['an unknown fit', {...DEFAULT_BACKGROUND_DISPLAY, fit: 'stretch'}],
    ['a missing number', {...DEFAULT_BACKGROUND_DISPLAY, dim: undefined}],
    ['a non-finite number', {...DEFAULT_BACKGROUND_DISPLAY, blur: NaN}],
    ['a string number', {...DEFAULT_BACKGROUND_DISPLAY, focusX: '50'}],
    ['a string opacity', {...DEFAULT_BACKGROUND_DISPLAY, paneOpacity: '50'}],
  ])('rejects %s', (_, data) => {
    expect(parseBackgroundDisplay(data)).toBeNull();
  });
});

describe('displayEquals', () => {
  it('compares every field', () => {
    const base = DEFAULT_BACKGROUND_DISPLAY;
    expect(displayEquals(base, {...base})).toBe(true);
    expect(displayEquals(base, {...base, blur: 1})).toBe(false);
    expect(displayEquals(base, {...base, fit: 'contain'})).toBe(false);
    expect(displayEquals(base, {...base, paneOpacity: 0})).toBe(false);
  });
});

describe('backgroundDisplaySlice', () => {
  it('is a small sync slice', () => {
    expect(backgroundDisplaySlice.area).toBe('sync');
    expect(
      itemBytes(backgroundDisplaySlice.key, DEFAULT_BACKGROUND_DISPLAY),
    ).toBeLessThan(QUOTA_BYTES_PER_ITEM / 50);
  });
});
