import {useState, type FormEvent} from 'react';
import {FiEye, FiEyeOff} from 'react-icons/fi';
import {
  saveWeatherApiKey,
  SettingsWriteError,
  type StorageBackendKind,
} from '../../lib/storage';
import {WEATHERAPI_SIGNUP_URL} from '../../lib/weatherApi';
import {Button, IconButton} from '../ui/Button';
import * as ui from '../ui/styles';
import {TextInput} from '../ui/TextInput';
import {ConflictNotice} from './ConflictNotice';
import {useKeyTester} from './useKeyTester';
import {useReportDirty, useSyncedDraft} from './useSyncedDraft';

interface ApiKeySectionProps {
  savedKey: string;
  backend: StorageBackendKind;
  onDirtyChange?: (dirty: boolean) => void;
}

function keyEquals(a: string, b: string) {
  return a.trim() === b.trim();
}

/**
 * Settings section for entering, testing, saving and clearing the WeatherAPI
 * key.
 */
export function ApiKeySection({
  savedKey,
  backend,
  onDirtyChange,
}: ApiKeySectionProps) {
  const {draft, setDraft, dirty, conflict, reload} = useSyncedDraft(
    savedKey,
    keyEquals,
  );
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ui.StatusMessage | null>(null);
  const tester = useKeyTester();
  useReportDirty(dirty, onDirtyChange);

  const trimmed = draft.trim();
  const busy: 'save' | 'test' | null = saving
    ? 'save'
    : tester.testing
      ? 'test'
      : null;

  async function persist(value: string) {
    if (busy) return;
    setSaving(true);
    setDraft(value);
    try {
      await saveWeatherApiKey(value);
      setStatus({tone: 'ok', text: value ? 'Key saved.' : 'Key cleared.'});
    } catch (err) {
      const text =
        err instanceof SettingsWriteError ? err.message : 'Could not save.';
      setStatus({tone: 'error', text});
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (busy || !trimmed) return;
    setStatus({tone: 'info', text: 'Testing…'});
    const result = await tester.run(trimmed);
    if (result) setStatus(result);
  }

  return (
    <section aria-labelledby="settings-api-key-title">
      <h3 id="settings-api-key-title" className={ui.sectionTitleClass}>
        Weather API key
      </h3>
      <p className="mt-1 text-sm text-fg-subtle">
        Get a free key at{' '}
        <a
          href={WEATHERAPI_SIGNUP_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-fg-muted"
        >
          weatherapi.com
        </a>
        .
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void persist(trimmed);
        }}
        className="mt-3"
      >
        <label htmlFor="settings-api-key" className="sr-only">
          WeatherAPI key
        </label>
        <div className="flex items-center gap-2">
          <TextInput
            id="settings-api-key"
            type={visible ? 'text' : 'password'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Paste your WeatherAPI key"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <IconButton
            onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Hide API key' : 'Show API key'}
            aria-pressed={visible}
            title={visible ? 'Hide key' : 'Show key'}
          >
            {visible ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
          </IconButton>
        </div>

        {conflict && <ConflictNotice onReload={reload} />}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={busy !== null || !dirty}>
            {busy === 'save' ? 'Saving…' : 'Save'}
          </Button>
          <Button
            onClick={() => void handleTest()}
            disabled={busy !== null || !trimmed}
          >
            {busy === 'test' ? 'Testing…' : 'Test'}
          </Button>
          <Button
            onClick={() => void persist('')}
            disabled={busy !== null || (!savedKey && !draft)}
          >
            Clear
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

      <p className="mt-3 text-xs text-fg-subtle">
        Stored in Chrome sync (your Google account) when signed in; otherwise
        only on this device.
        {backend === 'local-storage' &&
          " Dev mode: saved in this browser's localStorage."}
      </p>
    </section>
  );
}
