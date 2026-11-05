import {useEffect, useId, useMemo, useState, type FormEvent} from 'react';
import {ConflictNotice} from '../../settings/ConflictNotice';
import type {SettingsSectionProps} from '../../settings/sections';
import {clearSlicePreview, setSlicePreview} from '../../settings/slicePreview';
import {SettingsWriteError, saveSlice, useSlice} from '../../settings/slices';
import {useReportDirty, useSyncedDraft} from '../../settings/useSyncedDraft';
import {Button} from '../../ui/Button';
import * as ui from '../../ui/styles';
import {clockSlice, type ClockSettings} from '../clock/settings';
import {AccentOptions} from './AccentOptions';
import {ClockOptions} from './ClockOptions';
import {presetById} from './presets';
import {SurfaceOptions} from './SurfaceOptions';
import {ThemeOptions} from './ThemeOptions';
import {themeSlice, type ThemeSettings} from './themeSettings';

interface AppearanceDraft {
  theme: ThemeSettings;
  clock: ClockSettings;
}

// Plain JSON data with a fixed key order, so comparing text is enough
function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const DEFAULTS: AppearanceDraft = {
  theme: themeSlice.default,
  clock: clockSlice.default,
};

/** Shows unsaved edits on the page; the saved look returns on unmount. */
function useLivePreview({theme, clock}: AppearanceDraft, dirty: boolean) {
  useEffect(() => {
    if (dirty) {
      setSlicePreview(themeSlice, theme);
      setSlicePreview(clockSlice, clock);
    } else {
      clearSlicePreview(themeSlice);
      clearSlicePreview(clockSlice);
    }
  }, [theme, clock, dirty]);

  useEffect(
    () => () => {
      clearSlicePreview(themeSlice);
      clearSlicePreview(clockSlice);
    },
    [],
  );
}

/** The Appearance section: theme, accent, surfaces and clock, previewed live. */
export function AppearanceSettings({
  title,
  onDirtyChange,
}: SettingsSectionProps) {
  const baseId = useId();
  const {value: theme} = useSlice(themeSlice);
  const {value: clock} = useSlice(clockSlice);
  const saved = useMemo(() => ({theme, clock}), [theme, clock]);
  const {draft, setDraft, dirty, conflict, reload} =
    useSyncedDraft<AppearanceDraft>(saved, sameValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ui.StatusMessage | null>(null);
  useReportDirty(dirty, onDirtyChange);
  useLivePreview(draft, dirty);

  function edit(changes: Partial<AppearanceDraft>) {
    setDraft(current => ({...current, ...changes}));
    setStatus(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (!sameValue(draft.theme, saved.theme)) {
        await saveSlice(themeSlice, draft.theme);
      }
      if (!sameValue(draft.clock, saved.clock)) {
        await saveSlice(clockSlice, draft.clock);
      }
      setStatus({tone: 'ok', text: 'Saved.'});
    } catch (err) {
      const text =
        err instanceof SettingsWriteError ? err.message : 'Could not save.';
      setStatus({tone: 'error', text});
    } finally {
      setSaving(false);
    }
  }

  const {mode, preset, lightPreset, darkPreset} = draft.theme;
  const shownPresets = (
    mode === 'fixed' ? [preset] : [...new Set([lightPreset, darkPreset])]
  ).map(presetById);
  const titleId = `${baseId}-title`;

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={ui.sectionTitleClass}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-fg-subtle">
        Changes show right away; Save to keep them.
      </p>

      <form
        onSubmit={e => void handleSave(e)}
        noValidate
        className="mt-3 flex flex-col gap-6"
      >
        <ThemeOptions
          idPrefix={`${baseId}-theme`}
          value={draft.theme}
          onChange={next => edit({theme: next})}
        />
        <AccentOptions
          idPrefix={`${baseId}-accent`}
          value={draft.theme.accent}
          onChange={accent => edit({theme: {...draft.theme, accent}})}
          presets={shownPresets}
        />
        <SurfaceOptions
          idPrefix={`${baseId}-surface`}
          value={draft.theme}
          onChange={next => edit({theme: next})}
        />
        <ClockOptions
          idPrefix={`${baseId}-clock`}
          value={draft.clock}
          onChange={next => edit({clock: next})}
        />

        {conflict && <ConflictNotice onReload={reload} />}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setDraft(DEFAULTS);
              setStatus({
                tone: 'info',
                text: 'Defaults restored — Save to apply.',
              });
            }}
            disabled={sameValue(draft, DEFAULTS)}
          >
            Reset to defaults
          </Button>
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <p
            role="status"
            aria-live="polite"
            className={`text-sm ${status ? ui.statusClass[status.tone] : ''}`}
          >
            {status?.text}
          </p>
        </div>
      </form>
    </section>
  );
}
