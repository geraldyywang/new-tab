import {useId, useState, type FormEvent} from 'react';
import {FiPlus} from 'react-icons/fi';
import type {StoredLink} from '../../lib/links';
import {SettingsWriteError} from '../../lib/storage';
import * as ui from '../ui/styles';
import ConflictNotice from './ConflictNotice';
import LinkRow from './LinkRow';
import {useLinksDraft} from './linksDraft';
import {useReportDirty} from './useSyncedDraft';

interface LinksEditorProps {
  title: string;
  description: string;
  links: readonly StoredLink[];
  defaults: readonly StoredLink[];
  /** `null` means "use the defaults" (the stored list is removed). */
  onSave: (links: StoredLink[] | null) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const LinksEditor = (props: LinksEditorProps) => {
  const {title, description, links, defaults, onSave} = props;
  const baseId = useId();
  const draft = useLinksDraft(links, defaults);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ui.StatusMessage | null>(null);
  useReportDirty(draft.dirty, props.onDirtyChange);

  // Any edit clears the last "Saved." / error message
  const edit = (change: () => void) => {
    change();
    setStatus(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const prepared = draft.prepareSave();
    if (!prepared) {
      setStatus({tone: 'error', text: 'Fix the highlighted links first.'});
      return;
    }
    setSaving(true);
    try {
      await onSave(prepared.links);
      draft.clearValidation();
      setStatus({tone: 'ok', text: 'Saved.'});
    } catch (err) {
      const text =
        err instanceof SettingsWriteError ? err.message : 'Could not save.';
      setStatus({tone: 'error', text});
    } finally {
      setSaving(false);
    }
  };

  const titleId = `${baseId}-title`;

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={ui.sectionTitleClass}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>

      <form onSubmit={e => void handleSave(e)} noValidate className="mt-3">
        {draft.rows.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">No links.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {draft.rows.map((row, index) => (
              <LinkRow
                key={row.id}
                row={row}
                index={index}
                count={draft.rows.length}
                idPrefix={baseId}
                errorFor={field => draft.errorFor(index, field)}
                onChange={(field, value) =>
                  edit(() =>
                    draft.dispatch({
                      type: 'update',
                      index,
                      patch: {[field]: value},
                    }),
                  )
                }
                onBlur={field => draft.markTouched(row.id, field)}
                onMove={delta =>
                  edit(() => draft.dispatch({type: 'move', index, delta}))
                }
                onRemove={() =>
                  edit(() => draft.dispatch({type: 'remove', index}))
                }
              />
            ))}
          </ol>
        )}

        {draft.conflict && <ConflictNotice onReload={draft.reload} />}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => edit(draft.add)}
            disabled={!draft.canAdd}
            className={ui.buttonClass}
          >
            <FiPlus aria-hidden /> Add link
          </button>
          <button
            type="button"
            onClick={() => {
              draft.reset();
              setStatus({
                tone: 'info',
                text: 'Defaults restored — Save to apply.',
              });
            }}
            disabled={draft.isDefault}
            className={ui.buttonClass}
          >
            Reset to defaults
          </button>
          <button
            type="submit"
            disabled={saving || !draft.dirty}
            className={ui.buttonClass}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
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
};

export default LinksEditor;
