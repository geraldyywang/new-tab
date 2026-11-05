import {afterEach, describe, expect, it} from 'vitest';
import {
  applyCachedTheme,
  applyTheme,
  MIN_ACCENT_CONTRAST,
  THEME_CACHE_KEY,
  visibleAccent,
  writeThemeCache,
} from './applyTheme';
import {contrastRatio, parseColor, type Rgb} from '../../theme/color';
import {presetById, THEME_PRESETS, TOKEN_NAMES} from './presets';
import {DEFAULT_THEME_SETTINGS, type ThemeSettings} from './themeSettings';
import {writePhotoCache} from '../background/photoBackdrop';
import {TEST_PALETTE} from '../../test/photoFixtures';

const PHOTO = {palette: TEST_PALETTE, dim: 0.2};

function rgb(text: string): Rgb {
  const parsed = parseColor(text);
  if (!parsed) throw new Error(`Unparseable colour ${text}`);
  return parsed;
}

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-photo');
  root.removeAttribute('data-photo-legible');
  window.localStorage.clear();
});

describe('applyTheme', () => {
  it('leaves the default theme with no overrides at all', () => {
    applyTheme(root, 'stone');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('sets every token, the scheme and data-theme for a preset', () => {
    applyTheme(root, 'light');
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    for (const token of TOKEN_NAMES) {
      expect(root.style.getPropertyValue(`--color-${token}`)).toBe(
        presetById('light').tokens[token],
      );
    }
  });

  it('clears every override when switching back to the default', () => {
    applyTheme(root, 'dracula', '#ff0000');
    applyTheme(root, 'stone');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('overrides only the accent on the default theme', () => {
    applyTheme(root, 'stone', '#60a5fa');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.style.length).toBe(1);
    expect(root.style.getPropertyValue('--color-accent')).toBe('#60a5fa');
  });
});

describe('applyTheme with a photo', () => {
  it('sets translucent photo tokens and data-photo, then clears them', () => {
    applyTheme(root, 'stone', undefined, PHOTO);
    expect(root.dataset.photo).toBe('dark');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.style.getPropertyValue('--color-surface')).toMatch(
      /^#[\da-f]{8}$/,
    );
    expect(root.style.getPropertyValue('--color-backdrop')).toBe(
      TEST_PALETTE.average,
    );
    expect(root.style.getPropertyValue('--color-pane-shadow')).not.toBe('');

    applyTheme(root, 'stone');
    expect(root.hasAttribute('data-photo')).toBe(false);
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('flags panes too see-through to read, and clears the flag', () => {
    applyTheme(root, 'stone', undefined, {...PHOTO, paneOpacity: 0});
    expect(root.dataset.photoLegible).toBe('false');
    expect(root.style.getPropertyValue('--color-text-halo')).not.toBe('');
    applyTheme(root, 'stone', undefined, PHOTO);
    expect(root.hasAttribute('data-photo-legible')).toBe(false);
    applyTheme(root, 'stone');
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('takes light or dark panes from the theme', () => {
    applyTheme(root, 'light', undefined, PHOTO);
    expect(root.dataset.photo).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });

  it("prefers the user's accent to the photo's", () => {
    applyTheme(root, 'nord', '#2dd4bf', PHOTO);
    // Teal, if darkened to show on the light panes this photo gets
    const custom = rgb(root.style.getPropertyValue('--color-accent'));
    expect(custom.g).toBeGreaterThan(custom.r);
    applyTheme(root, 'nord', undefined, PHOTO);
    // The photo's vivid orange
    const own = rgb(root.style.getPropertyValue('--color-accent'));
    expect(own.r).toBeGreaterThan(own.g);
  });

  it('switching theme keeps the photo tokens on top', () => {
    applyTheme(root, 'dracula', undefined, PHOTO);
    const surface = root.style.getPropertyValue('--color-surface');
    expect(surface).not.toBe(presetById('dracula').tokens.surface);
    applyTheme(root, 'dracula');
    expect(root.style.getPropertyValue('--color-surface')).toBe(
      presetById('dracula').tokens.surface,
    );
    expect(root.style.getPropertyValue('--color-surface-overlay')).toBe('');
  });
});

describe('visibleAccent', () => {
  it('keeps an accent that is already visible', () => {
    expect(visibleAccent('#60a5fa', presetById('stone'))).toEqual({
      color: '#60a5fa',
      adjusted: false,
    });
  });

  it.each(THEME_PRESETS.map(preset => preset.id))(
    'adjusts hard-to-see accents to 3:1 on %s',
    id => {
      const preset = presetById(id);
      for (const accent of ['#000000', '#ffffff', '#fbbf24', '#3b4252']) {
        const {color} = visibleAccent(accent, preset);
        for (const background of [
          preset.tokens.surface,
          preset.tokens.backdrop,
        ]) {
          expect(
            contrastRatio(rgb(color), rgb(background)),
          ).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
        }
      }
    },
  );

  it('darkens a light accent on the light theme', () => {
    const result = visibleAccent('#fbbf24', presetById('light'));
    expect(result.adjusted).toBe(true);
    expect(rgb(result.color).r).toBeLessThan(rgb('#fbbf24').r);
  });
});

describe('theme cache', () => {
  const night = {prefersDark: true, now: new Date(2026, 10, 4, 23)};

  it('applies nothing without a cache', () => {
    expect(applyCachedTheme(root, night)).toBe(false);
    expect(root.hasAttribute('style')).toBe(false);
  });

  it('applies the cached settings, resolved for now', () => {
    const settings: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      mode: 'scheduled',
      darkPreset: 'nord',
      accent: '#2dd4bf',
    };
    writeThemeCache(settings);
    expect(applyCachedTheme(root, night)).toBe(true);
    expect(root.dataset.theme).toBe('nord');
    expect(root.style.getPropertyValue('--color-accent')).toBe('#2dd4bf');
  });

  it('applies a cached photo backdrop, even without a theme cache', () => {
    writePhotoCache(PHOTO);
    expect(applyCachedTheme(root, night)).toBe(false);
    expect(root.dataset.photo).toBe('dark');
  });

  it('ignores a corrupt cache', () => {
    window.localStorage.setItem(THEME_CACHE_KEY, '{not json');
    expect(applyCachedTheme(root, night)).toBe(false);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('survives storage that throws', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage; // only getItem is used
    expect(applyCachedTheme(root, night, blocked)).toBe(false);
  });
});
