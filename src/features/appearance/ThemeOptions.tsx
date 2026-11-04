import {TextInput} from '../../ui/TextInput';
import {
  Field,
  fieldLabelClass,
  HAS_FOCUS_RING_CLASS,
  NATIVE_CONTROL_CLASS,
  PresetSelect,
  Segmented,
} from './controls';
import {THEME_PRESETS, type PresetId, type ThemePreset} from './presets';
import {
  formatMinuteOfDay,
  parseMinuteOfDay,
  type ThemeMode,
  type ThemeSettings,
} from './themeSettings';

const MODES: ReadonlyArray<[ThemeMode, string]> = [
  ['fixed', 'Fixed'],
  ['system', 'Match system'],
  ['scheduled', 'Scheduled'],
];

interface ThemeOptionsProps {
  /** Prefix for element ids. */
  idPrefix: string;
  value: ThemeSettings;
  onChange: (value: ThemeSettings) => void;
}

/** A miniature of a preset: page, card and text in its colours. */
function PresetSwatch({preset}: {preset: ThemePreset}) {
  const {tokens} = preset;
  return (
    <span
      aria-hidden="true"
      className="flex h-12 items-center justify-center rounded-md"
      style={{backgroundColor: tokens.backdrop}}
    >
      <span
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-bold"
        style={{backgroundColor: tokens.surface, color: tokens.fg}}
      >
        Aa
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{backgroundColor: tokens.accent}}
        />
      </span>
    </span>
  );
}

function PresetGrid({
  name,
  value,
  onChange,
}: {
  name: string;
  value: PresetId;
  onChange: (value: PresetId) => void;
}) {
  return (
    <fieldset>
      <legend className={fieldLabelClass}>Theme</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEME_PRESETS.map(preset => (
          <label
            key={preset.id}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-1.5 text-sm text-fg-muted hover:bg-surface-2 has-checked:border-accent has-checked:text-fg has-checked:outline-1 has-checked:outline-accent ${HAS_FOCUS_RING_CLASS}`}
          >
            <input
              type="radio"
              name={name}
              value={preset.id}
              checked={value === preset.id}
              onChange={() => onChange(preset.id)}
              className="sr-only"
            />
            <PresetSwatch preset={preset} />
            <span className="px-0.5">{preset.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TimeField({
  id,
  label,
  minute,
  onChange,
}: {
  id: string;
  label: string;
  minute: number;
  onChange: (minute: number) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <TextInput
        id={id}
        type="time"
        required
        value={formatMinuteOfDay(minute)}
        onChange={e => {
          const parsed = parseMinuteOfDay(e.target.value);
          if (parsed !== null) onChange(parsed);
        }}
        className={NATIVE_CONTROL_CLASS}
      />
    </Field>
  );
}

/** Theme mode, presets and schedule. */
export function ThemeOptions({idPrefix, value, onChange}: ThemeOptionsProps) {
  function update(changes: Partial<ThemeSettings>) {
    onChange({...value, ...changes});
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        name={`${idPrefix}-mode`}
        legend="Mode"
        options={MODES}
        value={value.mode}
        onChange={mode => update({mode})}
      />

      {value.mode === 'fixed' ? (
        <PresetGrid
          name={`${idPrefix}-preset`}
          value={value.preset}
          onChange={preset => update({preset})}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Light theme" htmlFor={`${idPrefix}-light`}>
            <PresetSelect
              id={`${idPrefix}-light`}
              value={value.lightPreset}
              onChange={lightPreset => update({lightPreset})}
            />
          </Field>
          <Field label="Dark theme" htmlFor={`${idPrefix}-dark`}>
            <PresetSelect
              id={`${idPrefix}-dark`}
              value={value.darkPreset}
              onChange={darkPreset => update({darkPreset})}
            />
          </Field>
        </div>
      )}

      {value.mode === 'scheduled' && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              id={`${idPrefix}-from`}
              label="Light from"
              minute={value.lightFrom}
              onChange={lightFrom => update({lightFrom})}
            />
            <TimeField
              id={`${idPrefix}-until`}
              label="Until"
              minute={value.lightUntil}
              onChange={lightUntil => update({lightUntil})}
            />
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            Dark theme the rest of the day. An end before the start crosses
            midnight; equal times mean dark all day.
          </p>
        </div>
      )}
    </div>
  );
}
