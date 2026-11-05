import {Segmented} from './controls';
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

interface SurfaceOptionsProps {
  /** Prefix for element ids. */
  idPrefix: string;
  value: ThemeSettings;
  onChange: (value: ThemeSettings) => void;
}

/** How cards, bars and the settings dialog are drawn. */
export function SurfaceOptions({
  idPrefix,
  value,
  onChange,
}: SurfaceOptionsProps) {
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
    </div>
  );
}
