import {describe, expect, it} from 'vitest';
import {formatClock} from './clockFormat';
import {
  DEFAULT_CLOCK_SETTINGS,
  parseClockSettings,
  type ClockSettings,
} from './settings';

const AFTERNOON = new Date(2026, 10, 4, 15, 45, 12);
const MORNING = new Date(2026, 0, 9, 7, 5, 3);

function clock(date: Date, changes: Partial<ClockSettings>) {
  // ICU separates "PM" with a narrow no-break space; compare with a plain one
  return formatClock(date, {...DEFAULT_CLOCK_SETTINGS, ...changes}).replace(
    /\s/g,
    ' ',
  );
}

describe('formatClock', () => {
  it('matches the original clock by default', () => {
    for (const date of [AFTERNOON, MORNING]) {
      expect(formatClock(date, DEFAULT_CLOCK_SETTINGS)).toBe(
        date.toLocaleString('en-US'),
      );
    }
  });

  it('formats 12- and 24-hour time with and without seconds', () => {
    expect(clock(AFTERNOON, {dateFormat: 'none'})).toBe('3:45:12 PM');
    expect(clock(AFTERNOON, {dateFormat: 'none', showSeconds: false})).toBe(
      '3:45 PM',
    );
    expect(clock(AFTERNOON, {dateFormat: 'none', hour12: false})).toBe(
      '15:45:12',
    );
    expect(
      clock(MORNING, {dateFormat: 'none', hour12: false, showSeconds: false}),
    ).toBe('07:05');
  });

  it('formats midnight as 12 AM or 00', () => {
    const midnight = new Date(2026, 0, 1, 0, 30);
    const options = {dateFormat: 'none', showSeconds: false} as const;
    expect(clock(midnight, options)).toBe('12:30 AM');
    expect(clock(midnight, {...options, hour12: false})).toBe('00:30');
  });

  it('formats each date preset', () => {
    const timeOnly = {showSeconds: false, hour12: false} as const;
    expect(clock(AFTERNOON, {...timeOnly, dateFormat: 'numeric'})).toBe(
      '11/4/2026, 15:45',
    );
    expect(clock(AFTERNOON, {...timeOnly, dateFormat: 'short'})).toBe(
      'Wed, Nov 4, 15:45',
    );
    expect(clock(AFTERNOON, {...timeOnly, dateFormat: 'long'})).toBe(
      'Wednesday, November 4, 15:45',
    );
    expect(clock(MORNING, {...timeOnly, dateFormat: 'iso'})).toBe(
      '2026-01-09, 07:05',
    );
  });
});

describe('parseClockSettings', () => {
  it('round-trips valid settings and defaults invalid fields', () => {
    const settings: ClockSettings = {
      font: 'mono',
      hour12: false,
      showSeconds: false,
      dateFormat: 'iso',
    };
    expect(parseClockSettings(settings)).toEqual(settings);
    expect(
      parseClockSettings({font: 'comic', hour12: 'yes', dateFormat: 'long'}),
    ).toEqual({...DEFAULT_CLOCK_SETTINGS, dateFormat: 'long'});
    expect(parseClockSettings(42)).toBeNull();
  });
});
