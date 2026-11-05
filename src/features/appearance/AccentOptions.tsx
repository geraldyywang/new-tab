import {Button} from '../../ui/Button';
import {statusClass} from '../../ui/styles';
import {visibleAccent} from './applyTheme';
import {parseColor, toHex} from '../../theme/color';
import {
  fieldLabelClass,
  HAS_FOCUS_RING_CLASS,
  NATIVE_CONTROL_CLASS,
} from './controls';
import {ACCENT_PRESETS, type ThemePreset} from './presets';

interface AccentOptionsProps {
  idPrefix: string;
  /** `#rrggbb`, or unset for the theme's own accent. */
  value?: string;
  onChange: (accent: string | undefined) => void;
  /** The themes the accent will be drawn on (two when switching). */
  presets: readonly ThemePreset[];
}

const swatchClass = `relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border has-checked:outline-2 has-checked:outline-offset-2 has-checked:outline-fg ${HAS_FOCUS_RING_CLASS}`;

/** Accent colour: theme default, a swatch or a custom colour. */
export function AccentOptions(props: AccentOptionsProps) {
  const {idPrefix, value, onChange, presets} = props;
  const themeAccent = toHex(
    parseColor(presets[0].tokens.accent) ?? {r: 0.5, g: 0.5, b: 0.5},
  );
  const adjustedOn = value
    ? presets.filter(preset => visibleAccent(value, preset).adjusted)
    : [];
  const isSwatch = ACCENT_PRESETS.some(swatch => swatch.color === value);
  const customId = `${idPrefix}-custom`;

  return (
    <fieldset>
      <legend className={fieldLabelClass}>Accent</legend>
      <p className="mb-2 text-xs text-fg-subtle">
        Focus rings, the focused field and selections.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {ACCENT_PRESETS.map(swatch => (
          <label
            key={swatch.color}
            title={swatch.name}
            className={swatchClass}
            style={{backgroundColor: swatch.color}}
          >
            <input
              type="radio"
              name={`${idPrefix}-accent`}
              checked={value === swatch.color}
              onChange={() => onChange(swatch.color)}
              aria-label={swatch.name}
              className="sr-only"
            />
          </label>
        ))}
        <label htmlFor={customId} className="text-sm text-fg-muted">
          Custom
        </label>
        <input
          id={customId}
          type="color"
          value={value ?? themeAccent}
          onChange={e => onChange(e.target.value.toLowerCase())}
          className={`h-8 w-12 cursor-pointer rounded-md border border-border bg-surface-inset p-0.5 ${NATIVE_CONTROL_CLASS} ${value && !isSwatch ? 'outline-2 outline-offset-2 outline-fg' : ''}`}
        />
        <Button onClick={() => onChange(undefined)} disabled={!value}>
          Reset to theme default
        </Button>
      </div>
      {adjustedOn.length > 0 && (
        <p role="status" className={`mt-2 text-xs ${statusClass.info}`}>
          {`Hard to see on ${adjustedOn.map(preset => preset.name).join(' and ')}, so focus rings there use a shade with enough contrast.`}
        </p>
      )}
    </fieldset>
  );
}
