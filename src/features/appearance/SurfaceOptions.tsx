import {useId} from 'react';
import {FiAlertTriangle} from 'react-icons/fi';
import {Slider} from '../../ui/Slider';
import {Segmented} from './controls';
import {usePaneReadability, type PaneReadability} from './surfaceOpacity';
import type {SurfaceStyle, ThemeSettings} from './themeSettings';

const STYLES: ReadonlyArray<[SurfaceStyle, string]> = [
  ['solid', 'Solid'],
  ['frosted', 'Frosted'],
  ['glass', 'Liquid glass'],
];

const HINTS: Record<SurfaceStyle, string> = {
  solid: 'Opaque cards in the theme’s colours.',
  frosted: 'See-through cards that blur what lies behind them.',
  glass: 'Frosted cards whose edges catch the light.',
};

interface PaneOpacityProps {
  value: number | null;
  panes: PaneReadability;
  onChange: (value: number | null) => void;
}

/** Card opacity: Auto, or a chosen % with a warning when text won't read. */
function PaneOpacity({value, panes, onChange}: PaneOpacityProps) {
  const hintId = useId();
  return (
    <div className="mt-3 text-fg-muted">
      <Slider
        label="Card opacity"
        value={value ?? panes.autoOpacity}
        max={100}
        unit={value === null ? '% (Auto)' : '%'}
        onChange={onChange}
      />
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value === null}
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

interface SurfaceOptionsProps {
  /** Prefix for element ids. */
  idPrefix: string;
  value: ThemeSettings;
  onChange: (value: ThemeSettings) => void;
}

/**
 * How cards, bars and the settings dialog are drawn, and how see-through
 * frosted and glass cards are.
 */
export function SurfaceOptions({
  idPrefix,
  value,
  onChange,
}: SurfaceOptionsProps) {
  const panes = usePaneReadability(value);
  return (
    <div>
      <Segmented
        name={`${idPrefix}-style`}
        legend="Surfaces"
        options={STYLES}
        value={value.surface}
        onChange={surface => onChange({...value, surface})}
      />
      <p className="mt-1 text-sm text-fg-subtle">{HINTS[value.surface]}</p>
      {value.surface !== 'solid' && (
        <PaneOpacity
          value={value.surfaceOpacity}
          panes={panes}
          onChange={surfaceOpacity => onChange({...value, surfaceOpacity})}
        />
      )}
    </div>
  );
}
