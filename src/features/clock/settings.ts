import {defineSettingsSlice} from '../../settings/slices';

/** Font of the clock; system font stacks only, nothing is downloaded. */
export type ClockFont = 'sans' | 'mono' | 'serif' | 'display';

/** How the date before the time is written. */
export type DateFormat = 'numeric' | 'short' | 'long' | 'iso' | 'none';

/** Clock appearance. */
export interface ClockSettings {
  font: ClockFont;
  hour12: boolean;
  showSeconds: boolean;
  dateFormat: DateFormat;
}

/** Choices for each option, in menu order, with labels. */
export const CLOCK_FONTS: ReadonlyArray<[ClockFont, string]> = [
  ['sans', 'Sans'],
  ['mono', 'Mono'],
  ['serif', 'Serif'],
  ['display', 'Display'],
];

/** Date format choices, with an example each, in menu order. */
export const DATE_FORMATS: ReadonlyArray<[DateFormat, string]> = [
  ['numeric', '11/4/2026'],
  ['short', 'Wed, Nov 4'],
  ['long', 'Wednesday, November 4'],
  ['iso', '2026-11-04'],
  ['none', 'No date'],
];

/** The original clock: `toLocaleString('en-US')`. */
export const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  font: 'sans',
  hour12: true,
  showSeconds: true,
  dateFormat: 'numeric',
};

function pick<T>(
  choices: ReadonlyArray<[T, string]>,
  value: unknown,
  fallback: T,
) {
  return choices.find(([choice]) => choice === value)?.[0] ?? fallback;
}

/** Validates stored clock settings field by field. */
export function parseClockSettings(data: unknown): ClockSettings | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as Record<string, unknown>; // narrowed to an object above
  const d = DEFAULT_CLOCK_SETTINGS;
  return {
    font: pick(CLOCK_FONTS, raw.font, d.font),
    hour12: typeof raw.hour12 === 'boolean' ? raw.hour12 : d.hour12,
    showSeconds:
      typeof raw.showSeconds === 'boolean' ? raw.showSeconds : d.showSeconds,
    dateFormat: pick(DATE_FORMATS, raw.dateFormat, d.dateFormat),
  };
}

/** Clock appearance, synced across devices. */
export const clockSlice = defineSettingsSlice<ClockSettings>({
  key: 'appearance.clock',
  area: 'sync',
  parse: parseClockSettings,
  default: DEFAULT_CLOCK_SETTINGS,
});
