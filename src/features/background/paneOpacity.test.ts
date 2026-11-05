import {describe, expect, it} from 'vitest';
import {photoTokens} from '../appearance/photoTokens';
import {presetById} from '../appearance/presets';
import {TEST_PALETTE} from '../../test/photoFixtures';
import {paneReadability} from './paneOpacity';
import {DEFAULT_BACKGROUND_DISPLAY} from './settings';

describe('paneReadability', () => {
  const auto = DEFAULT_BACKGROUND_DISPLAY;

  it("reports Auto's opacity in whole percent and never warns on Auto", () => {
    expect(paneReadability(auto, {autoOpacity: 0.549, legible: true})).toEqual({
      autoOpacity: 55,
      warn: false,
    });
  });

  it('warns only for a chosen opacity whose text fails', () => {
    const chosen = {...auto, paneOpacity: 20};
    expect(
      paneReadability(chosen, {autoOpacity: 0.5, legible: false}).warn,
    ).toBe(true);
    expect(
      paneReadability(chosen, {autoOpacity: 0.5, legible: true}).warn,
    ).toBe(false);
  });

  it('warns below the readable opacity of a real photo, not above it', () => {
    const stone = presetById('stone');
    const backdrop = {palette: TEST_PALETTE, dim: 0.2};
    const {autoOpacity} = photoTokens(backdrop, stone);
    function warns(percent: number) {
      const theme = photoTokens(
        {...backdrop, paneOpacity: percent / 100},
        stone,
      );
      return paneReadability({...auto, paneOpacity: percent}, theme).warn;
    }
    expect(warns(0)).toBe(true);
    expect(warns(Math.ceil(autoOpacity * 100))).toBe(false);
    expect(warns(100)).toBe(false);
  });
});
