import {describe, expect, it} from 'vitest';
import {parsePhotoPalette} from './photoPalette';

describe('parsePhotoPalette', () => {
  const palette = {
    average: '#336699',
    darkest: '#000000',
    lightest: '#ffffff',
    vivid: '#e6285a',
  };

  it('accepts a valid palette', () => {
    expect(parsePhotoPalette(palette)).toEqual(palette);
  });

  it.each([
    ['not an object', 'red'],
    ['null', null],
    ['a missing colour', {...palette, vivid: undefined}],
    ['a non-hex colour', {...palette, average: 'rgb(0 0 0)'}],
  ])('rejects %s', (_, data) => {
    expect(parsePhotoPalette(data)).toBeNull();
  });
});
