import {afterEach, describe, expect, it} from 'vitest';
import {
  applyCachedTheme,
  applyTheme,
  MIN_ACCENT_CONTRAST,
  THEME_CACHE_KEY,
  visibleAccent,
  writeThemeCache,
} from './applyTheme';
import {contrastRatio, parseColor, type Rgb} from './color';
import {presetById, THEME_PRESETS, TOKEN_NAMES} from './presets';
import {DEFAULT_THEME_SETTINGS, type ThemeSettings} from './themeSettings';

function rgb(text: string): Rgb {
  const parsed = parseColor(text);
  if (!parsed) throw new Error(`Unparseable colour ${text}`);
  return parsed;
}

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
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
