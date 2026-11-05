import {useId} from 'react';
import {FiAlertTriangle} from 'react-icons/fi';
import {joinClasses, focusRingClass} from '../../ui/styles';
import {
  MAX_BLUR,
  MAX_DIM,
  type BackgroundDisplay,
  type BackgroundFit,
} from './settings';
import type {PaneReadability} from './paneOpacity';

interface DisplayControlsProps {
  value: BackgroundDisplay;
  onChange: (value: BackgroundDisplay) => void;
  disabled?: boolean;
  /** How the cards read over the photo; `null` hides the opacity control. */
  panes?: PaneReadability | null;
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

interface PaneOpacityProps {
  value: number | null;
  panes: PaneReadability;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}

/** Card opacity: Auto, or a chosen % with a warning when text won't read. */
function PaneOpacity({value, panes, disabled, onChange}: PaneOpacityProps) {
  const hintId = useId();
  return (
    <div className="sm:col-span-2">
      <Slider
        label="Card opacity"
        value={value ?? panes.autoOpacity}
        max={100}
        unit={value === null ? '% (Auto)' : '%'}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value === null}
            disabled={disabled}
            aria-describedby={panes.warn ? hintId : undefined}
            onChange={e =>
              onChange(e.target.checked ? null : panes.autoOpacity)
            }
            className="accent-accent"
          />
          Auto: as see-through as readable text allows
        </label>
        {panes.warn && (
          <p id={hintId} className="flex items-center gap-1.5 text-warning-fg">
            <FiAlertTriangle aria-hidden="true" />
            Text may be hard to read at this opacity.
          </p>
        )}
      </div>
    </div>
  );
}

/** Fit, focal point, dim, blur and card opacity controls for the photo. */
export function DisplayControls({
  value,
  onChange,
  disabled,
  panes,
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
        {panes && (
          <PaneOpacity
            value={value.paneOpacity}
            panes={panes}
            disabled={disabled}
            onChange={paneOpacity => set({paneOpacity})}
          />
        )}
      </div>
    </div>
  );
}
