import {useEffect, useId, useState, type FormEvent} from 'react';
import {ConflictNotice} from '../../settings/ConflictNotice';
import type {SettingsSectionProps} from '../../settings/sections';
import {
  resetSlice,
  saveSlice,
  SettingsWriteError,
  useSlice,
} from '../../settings/slices';
import {useReportDirty, useSyncedDraft} from '../../settings/useSyncedDraft';
import {Button} from '../../ui/Button';
import * as ui from '../../ui/styles';
import {BackgroundPhoto} from './BackgroundLayer';
import {DisplayControls} from './DisplayControls';
import {setDisplayPreview} from './displayPreview';
import {PhotoPicker} from './PhotoPicker';
import {
  backgroundDisplaySlice,
  DEFAULT_BACKGROUND_DISPLAY,
  displayEquals,
} from './settings';

// Width of the photo preview (sm:w-48), for scaling blur to match the page
const PREVIEW_WIDTH = 192;

/**
 * The Background section: upload or remove the photo (applied at once) and
 * edit how it is shown (previewed live, applied on Save).
 */
export function BackgroundSettings({
  title,
  onDirtyChange,
}: SettingsSectionProps) {
  const titleId = useId();
  const saved = useSlice(backgroundDisplaySlice).value;
  const {draft, setDraft, dirty, conflict, reload} = useSyncedDraft(
    saved,
    displayEquals,
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ui.StatusMessage | null>(null);
  useReportDirty(dirty, onDirtyChange);

  // Preview unsaved options on the page; closing the dialog drops them
  useEffect(() => {
    setDisplayPreview(dirty ? draft : null);
  }, [dirty, draft]);
  useEffect(() => () => setDisplayPreview(null), []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await (displayEquals(draft, DEFAULT_BACKGROUND_DISPLAY)
        ? resetSlice(backgroundDisplaySlice)
        : saveSlice(backgroundDisplaySlice, draft));
      setStatus({tone: 'ok', text: 'Saved.'});
    } catch (err) {
      const text =
        err instanceof SettingsWriteError ? err.message : 'Could not save.';
      setStatus({tone: 'error', text});
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={ui.sectionTitleClass}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-fg-subtle">
        Your photo stays on this computer and isn’t synced. A new photo applies
        right away; display options apply when you Save.
      </p>

      <div className="mt-3">
        <PhotoPicker
          preview={url => (
            <BackgroundPhoto
              url={url}
              display={draft}
              scale={PREVIEW_WIDTH / window.innerWidth}
            />
          )}
        />
      </div>

      <form onSubmit={e => void handleSave(e)} className="mt-4">
        <DisplayControls
          value={draft}
          onChange={value => {
            setDraft(value);
            setStatus(null);
          }}
        />

        {conflict && <ConflictNotice onReload={reload} />}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setDraft(DEFAULT_BACKGROUND_DISPLAY);
              setStatus({
                tone: 'info',
                text: 'Defaults restored — Save to apply.',
              });
            }}
            disabled={displayEquals(draft, DEFAULT_BACKGROUND_DISPLAY)}
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
