import {describe, expect, it} from 'vitest';
import {
  drawnSurfaceStyle,
  DEFAULT_THEME_SETTINGS,
  formatMinuteOfDay,
  isLightAt,
  msUntilNextSwitch,
  parseMinuteOfDay,
  parseThemeSettings,
  resolvePresetId,
  type ThemeSettings,
} from './themeSettings';

function at(hours: number, minutes = 0, seconds = 0) {
  return new Date(2026, 10, 4, hours, minutes, seconds);
}

const SCHEDULED: ThemeSettings = {
  ...DEFAULT_THEME_SETTINGS,
  mode: 'scheduled',
  lightPreset: 'light',
  darkPreset: 'nord',
  lightFrom: 7 * 60,
  lightUntil: 19 * 60 + 30,
};

describe('parseThemeSettings', () => {
  it('round-trips valid settings', () => {
    const settings = {
      ...SCHEDULED,
      surface: 'glass' as const,
      accent: '#a1b2c3',
    };
    expect(parseThemeSettings(JSON.parse(JSON.stringify(settings)))).toEqual(
      settings,
    );
  });

  it('defaults invalid fields one by one', () => {
    expect(
      parseThemeSettings({
        mode: 'sometimes',
        preset: 'nord',
        lightPreset: 'solarized',
        lightFrom: 1440,
        lightUntil: 1.5,
        accent: 'blue',
        surface: 'chrome',
      }),
    ).toEqual({...DEFAULT_THEME_SETTINGS, preset: 'nord'});
  });

  it('lower-cases the accent and rejects non-objects', () => {
    expect(parseThemeSettings({accent: '#ABCDEF'})?.accent).toBe('#abcdef');
    expect(parseThemeSettings('nord')).toBeNull();
    expect(parseThemeSettings(null)).toBeNull();
  });

  it('defaults to Stone with the theme accent', () => {
    expect(DEFAULT_THEME_SETTINGS.mode).toBe('fixed');
    expect(DEFAULT_THEME_SETTINGS.preset).toBe('stone');
    expect(DEFAULT_THEME_SETTINGS.accent).toBeUndefined();
  });
});

describe('drawnSurfaceStyle', () => {
  it('draws Auto as liquid glass over a photo and solid without one', () => {
    expect(DEFAULT_THEME_SETTINGS.surface).toBe('auto');
    expect(drawnSurfaceStyle('auto', true)).toBe('glass');
    expect(drawnSurfaceStyle('auto', false)).toBe('solid');
  });

  it('keeps a chosen style either way', () => {
    for (const style of ['solid', 'frosted', 'glass'] as const) {
      expect(drawnSurfaceStyle(style, true)).toBe(style);
      expect(drawnSurfaceStyle(style, false)).toBe(style);
    }
  });

  it('parses a stored Auto', () => {
    expect(parseThemeSettings({surface: 'auto'})?.surface).toBe('auto');
  });
});

describe('isLightAt', () => {
  it('handles a daytime window', () => {
    expect(isLightAt(6 * 60 + 59, 420, 1170)).toBe(false);
    expect(isLightAt(7 * 60, 420, 1170)).toBe(true);
    expect(isLightAt(19 * 60 + 29, 420, 1170)).toBe(true);
    expect(isLightAt(19 * 60 + 30, 420, 1170)).toBe(false);
  });

  it('handles a window crossing midnight', () => {
    // Light from 22:00 to 06:00
    expect(isLightAt(23 * 60, 1320, 360)).toBe(true);
    expect(isLightAt(0, 1320, 360)).toBe(true);
    expect(isLightAt(5 * 60 + 59, 1320, 360)).toBe(true);
    expect(isLightAt(6 * 60, 1320, 360)).toBe(false);
    expect(isLightAt(12 * 60, 1320, 360)).toBe(false);
  });

  it('treats an empty window as never light', () => {
    expect(isLightAt(480, 480, 480)).toBe(false);
  });
});

describe('resolvePresetId', () => {
  it('uses the fixed preset regardless of environment', () => {
    const settings = {...DEFAULT_THEME_SETTINGS, preset: 'dracula' as const};
    expect(resolvePresetId(settings, {prefersDark: false, now: at(12)})).toBe(
      'dracula',
    );
  });

  it('follows the system colour scheme', () => {
    const settings: ThemeSettings = {...SCHEDULED, mode: 'system'};
    expect(resolvePresetId(settings, {prefersDark: true, now: at(12)})).toBe(
      'nord',
    );
    expect(resolvePresetId(settings, {prefersDark: false, now: at(0)})).toBe(
      'light',
    );
  });

  it('follows the schedule', () => {
    expect(resolvePresetId(SCHEDULED, {prefersDark: true, now: at(12)})).toBe(
      'light',
    );
    expect(resolvePresetId(SCHEDULED, {prefersDark: false, now: at(20)})).toBe(
      'nord',
    );
  });
});

describe('msUntilNextSwitch', () => {
  it('counts to the next boundary today', () => {
    expect(msUntilNextSwitch(at(6, 59, 30), 420, 1170)).toBe(30_000);
    expect(msUntilNextSwitch(at(12), 420, 1170)).toBe((7 * 60 + 30) * 60_000);
  });

  it('wraps past midnight', () => {
    expect(msUntilNextSwitch(at(20), 420, 1170)).toBe(11 * 60 * 60_000);
    expect(msUntilNextSwitch(at(23), 1320, 360)).toBe(7 * 60 * 60_000);
  });

  it('waits a full day when exactly on the only boundary', () => {
    expect(msUntilNextSwitch(at(8), 480, 480)).toBe(24 * 60 * 60_000);
  });
});

describe('minute-of-day text', () => {
  it('formats and parses HH:MM', () => {
    expect(formatMinuteOfDay(7 * 60 + 5)).toBe('07:05');
    expect(formatMinuteOfDay(0)).toBe('00:00');
    expect(parseMinuteOfDay('23:59')).toBe(1439);
    expect(parseMinuteOfDay('24:00')).toBeNull();
    expect(parseMinuteOfDay('7:05')).toBeNull();
    expect(parseMinuteOfDay('')).toBeNull();
  });
});
