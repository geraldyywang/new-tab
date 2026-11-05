import {useId} from 'react';
import {focusRingClass, joinClasses} from './styles';

interface SliderProps {
  label: string;
  value: number;
  max: number;
  /** Shown after the value, e.g. `%` or ` px`. */
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/** A labelled range input from 0 to `max`, showing its value. */
export function Slider({
  label,
  value,
  max,
  unit,
  disabled,
  onChange,
}: SliderProps) {
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
