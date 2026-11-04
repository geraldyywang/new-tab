import {defineSettingsSlice} from '../../settings/slices';
import {DEFAULT_PRESET_ID, isPresetId, type PresetId} from './presets';

/** How the active theme is chosen. */
export type ThemeMode = 'fixed' | 'system' | 'scheduled';

const THEME_MODES: readonly ThemeMode[] = ['fixed', 'system', 'scheduled'];

const MINUTES_PER_DAY = 24 * 60;

/**
 * Theme choice and accent. Later appearance options (such as the surface
 * style of #29) are meant to be added here as more fields.
 */
export interface ThemeSettings {
  mode: ThemeMode;
  /** The theme in `fixed` mode. */
  preset: PresetId;
  /** The light and dark themes in `system` and `scheduled` mode. */
  lightPreset: PresetId;
  darkPreset: PresetId;
  /** `scheduled`: light from this minute after midnight... */
  lightFrom: number;
  /** ...until this one (exclusive); may be earlier, to cross midnight. */
  lightUntil: number;
  /** Custom accent as `#rrggbb`; unset uses the theme's own accent. */
  accent?: string;
}

/** The original look: Stone, theme accent. */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'fixed',
  preset: DEFAULT_PRESET_ID,
  lightPreset: 'light',
  darkPreset: DEFAULT_PRESET_ID,
  lightFrom: 7 * 60,
  lightUntil: 19 * 60,
};

function isMinuteOfDay(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= 0 &&
    Number(value) < MINUTES_PER_DAY
  );
}

/** Whether `value` is a `#rrggbb` colour. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}

/**
 * Validates stored theme settings field by field: an invalid or missing field
 * takes its default, so adding a field never discards the rest.
 */
export function parseThemeSettings(data: unknown): ThemeSettings | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as Record<string, unknown>; // narrowed to an object above
  const d = DEFAULT_THEME_SETTINGS;
  const settings: ThemeSettings = {
    mode: THEME_MODES.find(mode => mode === raw.mode) ?? d.mode,
    preset: isPresetId(raw.preset) ? raw.preset : d.preset,
    lightPreset: isPresetId(raw.lightPreset) ? raw.lightPreset : d.lightPreset,
    darkPreset: isPresetId(raw.darkPreset) ? raw.darkPreset : d.darkPreset,
    lightFrom: isMinuteOfDay(raw.lightFrom) ? raw.lightFrom : d.lightFrom,
    lightUntil: isMinuteOfDay(raw.lightUntil) ? raw.lightUntil : d.lightUntil,
  };
  if (isHexColor(raw.accent)) settings.accent = raw.accent.toLowerCase();
  return settings;
}

/** Theme choice and accent, synced across devices. */
export const themeSlice = defineSettingsSlice<ThemeSettings>({
  key: 'appearance.theme',
  area: 'sync',
  parse: parseThemeSettings,
  default: DEFAULT_THEME_SETTINGS,
});

/** What the active theme depends on besides the settings. */
export interface ThemeEnvironment {
  /** `prefers-color-scheme: dark` matches. */
  prefersDark: boolean;
  now: Date;
}

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Whether `minute` falls in the light window `[from, until)`. A window whose
 * end is earlier than its start crosses midnight; an empty one (equal ends)
 * is never light.
 */
export function isLightAt(minute: number, from: number, until: number) {
  return from <= until
    ? minute >= from && minute < until
    : minute >= from || minute < until;
}

/** The theme to show now. */
export function resolvePresetId(
  settings: ThemeSettings,
  {prefersDark, now}: ThemeEnvironment,
): PresetId {
  switch (settings.mode) {
    case 'fixed':
      return settings.preset;
    case 'system':
      return prefersDark ? settings.darkPreset : settings.lightPreset;
    case 'scheduled':
      return isLightAt(
        minuteOfDay(now),
        settings.lightFrom,
        settings.lightUntil,
      )
        ? settings.lightPreset
        : settings.darkPreset;
  }
}

/** Milliseconds from `now` until the schedule next switches theme. */
export function msUntilNextSwitch(
  now: Date,
  from: number,
  until: number,
): number {
  const dayMs = MINUTES_PER_DAY * 60_000;
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const elapsed = now.getTime() - midnight.getTime();
  return Math.min(
    ...[from, until].map(
      minute => (minute * 60_000 - elapsed + dayMs) % dayMs || dayMs,
    ),
  );
}

/** `HH:MM` for a minute of the day, as `<input type="time">` uses. */
export function formatMinuteOfDay(minute: number): string {
  return [Math.floor(minute / 60), minute % 60]
    .map(part => String(part).padStart(2, '0'))
    .join(':');
}

/** Minute of the day for `HH:MM`; `null` if invalid. */
export function parseMinuteOfDay(text: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}
