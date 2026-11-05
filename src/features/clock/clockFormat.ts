import type {ClockFont, ClockSettings, DateFormat} from './settings';

/**
 * CSS font stacks for each clock font, from fonts already on the system.
 * `sans` inherits the page font, as the clock always has.
 */
export const CLOCK_FONT_STACKS: Readonly<
  Record<ClockFont, string | undefined>
> = {
  sans: undefined,
  mono: "ui-monospace, 'Cascadia Mono', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  display:
    "Bahnschrift, 'DIN Alternate', 'Avenir Next Condensed', 'Franklin Gothic Medium', 'Arial Narrow', sans-serif",
};

const DATE_OPTIONS: Partial<Record<DateFormat, Intl.DateTimeFormatOptions>> = {
  numeric: {year: 'numeric', month: 'numeric', day: 'numeric'},
  short: {weekday: 'short', month: 'short', day: 'numeric'},
  long: {weekday: 'long', month: 'long', day: 'numeric'},
};

function formatDate(date: Date, format: DateFormat): string | null {
  if (format === 'none') return null;
  if (format === 'iso') {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((part, i) => String(part).padStart(i === 0 ? 4 : 2, '0'))
      .join('-');
  }
  return date.toLocaleDateString('en-US', DATE_OPTIONS[format]);
}

/** The time as the clock shows it. */
export function formatTime(
  date: Date,
  {hour12, showSeconds}: Pick<ClockSettings, 'hour12' | 'showSeconds'>,
): string {
  return date.toLocaleTimeString('en-US', {
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    ...(showSeconds && {second: '2-digit'}),
    hourCycle: hour12 ? 'h12' : 'h23',
  });
}

/**
 * The clock's text: date and time, `11/4/2026, 3:45:12 PM` by default (the
 * same as `toLocaleString('en-US')`).
 */
export function formatClock(date: Date, settings: ClockSettings): string {
  const time = formatTime(date, settings);
  const day = formatDate(date, settings.dateFormat);
  return day ? `${day}, ${time}` : time;
}
