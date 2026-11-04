import {FiArrowDown, FiArrowUp, FiTrash2} from 'react-icons/fi';
import {
  MAX_LABEL_LENGTH,
  MAX_URL_LENGTH,
  type StoredLink,
} from '../../lib/links';
import {IconButton} from '../ui/Button';
import * as ui from '../ui/styles';
import {TextInput} from '../ui/TextInput';
import type {LinkField} from './linksDraft';

interface LinkRowProps {
  row: StoredLink;
  index: number;
  count: number;
  /** Prefix for element ids, unique per editor. */
  idPrefix: string;
  errorFor: (field: LinkField) => string | undefined;
  onChange: (field: LinkField, value: string) => void;
  onBlur: (field: LinkField) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

const FIELDS: Record<
  LinkField,
  {label: string; placeholder: string; maxLength: number}
> = {
  label: {label: 'Label', placeholder: 'Label', maxLength: MAX_LABEL_LENGTH},
  url: {
    label: 'URL',
    placeholder: 'https://example.com/',
    maxLength: MAX_URL_LENGTH,
  },
};

/**
 * One row of a links editor: label and URL inputs plus move and remove buttons.
 */
export function LinkRow(props: LinkRowProps) {
  const {row, index, count, idPrefix, errorFor} = props;
  const name = row.label.trim() || `link ${index + 1}`;

  function field(key: LinkField) {
    const id = `${idPrefix}-${row.id}-${key}`;
    const error = errorFor(key);
    const {label, placeholder, maxLength} = FIELDS[key];
    return (
      <div>
        <label htmlFor={id} className="sr-only">
          {label} for link {index + 1}
        </label>
        <TextInput
          id={id}
          type={key === 'url' ? 'url' : 'text'}
          inputMode={key === 'url' ? 'url' : undefined}
          spellCheck={key === 'url' ? false : undefined}
          value={row[key]}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={e => props.onChange(key, e.target.value)}
          onBlur={() => props.onBlur(key)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p
            id={`${id}-error`}
            className={`mt-1 text-xs ${ui.statusClass.error}`}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <li className="flex items-start gap-2">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {field('label')}
        {field('url')}
      </div>
      <div className="flex shrink-0 items-center">
        <IconButton
          onClick={() => props.onMove(-1)}
          disabled={index === 0}
          aria-label={`Move ${name} up`}
          title="Move up"
        >
          <FiArrowUp aria-hidden />
        </IconButton>
        <IconButton
          onClick={() => props.onMove(1)}
          disabled={index === count - 1}
          aria-label={`Move ${name} down`}
          title="Move down"
        >
          <FiArrowDown aria-hidden />
        </IconButton>
        <IconButton
          onClick={props.onRemove}
          aria-label={`Remove ${name}`}
          title="Remove"
        >
          <FiTrash2 aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}
