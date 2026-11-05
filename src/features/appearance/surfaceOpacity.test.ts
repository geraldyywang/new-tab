import {describe, expect, it} from 'vitest';
import {TEST_PALETTE} from '../../test/photoFixtures';
import {photoTokens} from './photoTokens';
import {presetById} from './presets';
import {paneReadability} from './surfaceOpacity';

describe('paneReadability', () => {
  it("reports Auto's opacity in whole percent and never warns on Auto", () => {
    expect(paneReadability(null, {autoOpacity: 0.549, legible: true})).toEqual({
      autoOpacity: 55,
      warn: false,
    });
  });

  it('warns only for a chosen opacity whose text fails', () => {
    expect(paneReadability(20, {autoOpacity: 0.5, legible: false}).warn).toBe(
      true,
    );
    expect(paneReadability(20, {autoOpacity: 0.5, legible: true}).warn).toBe(
      false,
    );
  });

  it('warns below the readable opacity of a real photo, not above it', () => {
    const stone = presetById('stone');
    const backdrop = {palette: TEST_PALETTE, dim: 0.2};
    const {autoOpacity} = photoTokens(backdrop, stone);
    function warns(percent: number) {
      const theme = photoTokens(backdrop, stone, undefined, percent / 100);
      return paneReadability(percent, theme).warn;
    }
    expect(warns(0)).toBe(true);
    expect(warns(Math.ceil(autoOpacity * 100))).toBe(false);
    expect(warns(100)).toBe(false);
  });
});
