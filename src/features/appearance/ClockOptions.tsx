import {useState} from 'react';
import {CLOCK_FONT_STACKS, formatClock} from '../clock/clockFormat';
import {CLOCK_FONTS, DATE_FORMATS, type ClockSettings} from '../clock/settings';
import {Select} from '../../ui/Select';
import {
  Field,
  fieldLabelClass,
  NATIVE_CONTROL_CLASS,
  Segmented,
} from './controls';

const HOUR_CYCLES: ReadonlyArray<['12' | '24', string]> = [
  ['12', '12-hour'],
  ['24', '24-hour'],
];

interface ClockOptionsProps {
  idPrefix: string;
  value: ClockSettings;
  onChange: (value: ClockSettings) => void;
}

/** Clock font, hour cycle, seconds and date format, with a sample. */
export function ClockOptions({idPrefix, value, onChange}: ClockOptionsProps) {
  const [sampleTime] = useState(() => new Date());

  function update(changes: Partial<ClockSettings>) {
    onChange({...value, ...changes});
  }

  return (
    <fieldset>
      <legend className={fieldLabelClass}>Clock</legend>
      <p
        className="mb-3 rounded-lg bg-surface-inset px-3 py-2 text-xl font-bold text-fg-subtle"
        style={{fontFamily: CLOCK_FONT_STACKS[value.font]}}
      >
        {formatClock(sampleTime, value)}
      </p>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
        <Field label="Font" htmlFor={`${idPrefix}-font`}>
          <Select
            id={`${idPrefix}-font`}
            value={value.font}
            onChange={e => {
              const font = CLOCK_FONTS.find(([f]) => f === e.target.value);
              if (font) update({font: font[0]});
            }}
            className={NATIVE_CONTROL_CLASS}
          >
            {CLOCK_FONTS.map(([font, label]) => (
              <option key={font} value={font}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor={`${idPrefix}-date`}>
          <Select
            id={`${idPrefix}-date`}
            value={value.dateFormat}
            onChange={e => {
              const format = DATE_FORMATS.find(([f]) => f === e.target.value);
              if (format) update({dateFormat: format[0]});
            }}
            className={NATIVE_CONTROL_CLASS}
          >
            {DATE_FORMATS.map(([format, example]) => (
              <option key={format} value={format}>
                {example}
              </option>
            ))}
          </Select>
        </Field>
        <Segmented
          name={`${idPrefix}-hours`}
          legend="Hours"
          options={HOUR_CYCLES}
          value={value.hour12 ? '12' : '24'}
          onChange={cycle => update({hour12: cycle === '12'})}
        />
        <label className="flex items-center gap-2 pb-1.5 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={value.showSeconds}
            onChange={e => update({showSeconds: e.target.checked})}
            className={`h-4 w-4 accent-accent ${NATIVE_CONTROL_CLASS}`}
          />
          Show seconds
        </label>
      </div>
    </fieldset>
  );
}
