import type {ReactNode} from 'react';
import {Select} from '../../ui/Select';
import {THEME_PRESETS, type PresetId} from './presets';

/**
 * Stone sets no `color-scheme`, so give native controls (time picker icons,
 * colour pickers) the dark scheme there; other themes set their own.
 */
export const NATIVE_CONTROL_CLASS = '[:root:not([data-theme])_&]:scheme-dark';

/** `focusRingClass` for a label around a visually hidden radio button. */
export const HAS_FOCUS_RING_CLASS =
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent';

/** Small caption above a control. */
export const fieldLabelClass = 'mb-1 block text-xs font-bold text-fg-subtle';

/** One labelled field. */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** A row of mutually exclusive text options (radio buttons). */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: ReadonlyArray<[T, string]>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={fieldLabelClass}>{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-inset p-1">
        {options.map(([option, label]) => (
          <label
            key={option}
            className={`cursor-pointer rounded-md px-3 py-1 text-sm font-bold text-fg-subtle hover:text-fg has-checked:bg-surface-3 has-checked:text-fg ${HAS_FOCUS_RING_CLASS}`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Drop-down list of the theme presets. */
export function PresetSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: PresetId;
  onChange: (value: PresetId) => void;
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={e => {
        const preset = THEME_PRESETS.find(p => p.id === e.target.value);
        if (preset) onChange(preset.id);
      }}
      className={NATIVE_CONTROL_CLASS}
    >
      {THEME_PRESETS.map(preset => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </Select>
  );
}
