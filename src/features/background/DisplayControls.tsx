import {useId} from 'react';
import {joinClasses, focusRingClass} from '../../ui/styles';
import {
  MAX_BLUR,
  MAX_DIM,
  type BackgroundDisplay,
  type BackgroundFit,
} from './settings';

interface DisplayControlsProps {
  value: BackgroundDisplay;
  onChange: (value: BackgroundDisplay) => void;
  disabled?: boolean;
}

const FITS: ReadonlyArray<[BackgroundFit, string]> = [
  ['cover', 'Fill (crop)'],
  ['contain', 'Fit (letterbox)'],
];

interface SliderProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function Slider({label, value, max, unit, disabled, onChange}: SliderProps) {
  const id = useId();
  return (
    <div>
      <div className="flex justify-between text-sm">
        <label htmlFor={id}>{label}</label>
        <span className="text-fg-subtle tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className={joinClasses(
          'mt-1 w-full accent-accent disabled:opacity-40',
          focusRingClass,
        )}
      />
    </div>
  );
}

/** Fit, focal point, dim and blur controls for the background photo. */
export function DisplayControls({
  value,
  onChange,
  disabled,
}: DisplayControlsProps) {
  function set(patch: Partial<BackgroundDisplay>) {
    onChange({...value, ...patch});
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset disabled={disabled} className="flex flex-wrap gap-2">
        <legend className="mb-1 text-sm">Fit</legend>
        {FITS.map(([fit, label]) => (
          <label
            key={fit}
            className={joinClasses(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent',
              value.fit === fit
                ? 'border-accent bg-surface-2 text-fg'
                : 'border-border text-fg-muted',
            )}
          >
            <input
              type="radio"
              name="background-fit"
              value={fit}
              checked={value.fit === fit}
              onChange={() => set({fit})}
              className="accent-accent"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Focus left–right"
          value={value.focusX}
          max={100}
          unit="%"
          disabled={disabled}
          onChange={focusX => set({focusX})}
        />
        <Slider
          label="Focus top–bottom"
          value={value.focusY}
          max={100}
          unit="%"
          disabled={disabled}
          onChange={focusY => set({focusY})}
        />
        <Slider
          label="Dim"
          value={value.dim}
          max={MAX_DIM}
          unit="%"
          disabled={disabled}
          onChange={dim => set({dim})}
        />
        <Slider
          label="Blur"
          value={value.blur}
          max={MAX_BLUR}
          unit=" px"
          disabled={disabled}
          onChange={blur => set({blur})}
        />
      </div>
    </div>
  );
}
