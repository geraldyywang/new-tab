import {useRef, useState, type DragEvent, type ReactNode} from 'react';
import {FiImage, FiTrash2} from 'react-icons/fi';
import {Button} from '../../ui/Button';
import * as ui from '../../ui/styles';
import {BACKGROUND_IMAGE, useBackgroundImage} from './backgroundImage';
import type {BackgroundImageStore} from './backgroundImage';
import {BROWSER_CODEC} from './browserCodec';
import {
  ACCEPTED_TYPES,
  BackgroundImageError,
  processImage,
} from './imageProcessing';
import type {StoredImage, StoredImageMeta} from './imageStore';

interface PhotoPickerProps {
  /** Rendered in the preview box when there is a photo. */
  preview: (url: string) => ReactNode;
  /** Turns a file into the photo to store; the browser pipeline by default. */
  process?: (file: File) => Promise<StoredImage>;
  store?: BackgroundImageStore;
}

function defaultProcess(file: File) {
  return processImage(file, BROWSER_CODEC);
}

function describeImage(meta: StoredImageMeta) {
  const kilobytes = meta.byteSize / 1024;
  const size =
    kilobytes < 1024
      ? `${Math.max(1, Math.round(kilobytes))} KB`
      : `${(kilobytes / 1024).toFixed(1)} MB`;
  return `${meta.width} × ${meta.height}, ${size}`;
}

/**
 * Choose, drop or remove the background photo. A new photo is processed and
 * stored straight away; it isn't part of the section's Save.
 */
export function PhotoPicker({
  preview,
  process = defaultProcess,
  store = BACKGROUND_IMAGE,
}: PhotoPickerProps) {
  const {url, meta} = useBackgroundImage(store);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'processing' | 'removing' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<ui.StatusMessage | null>(null);

  async function run(
    kind: 'processing' | 'removing',
    action: () => Promise<string>,
  ) {
    setBusy(kind);
    setStatus(
      kind === 'processing'
        ? {tone: 'info', text: 'Resizing and compressing…'}
        : null,
    );
    try {
      setStatus({tone: 'ok', text: await action()});
    } catch (err) {
      const text =
        err instanceof BackgroundImageError
          ? err.message
          : 'Something went wrong with that image.';
      setStatus({tone: 'error', text});
    } finally {
      setBusy(null);
    }
  }

  function acceptFile(file: File | undefined) {
    if (!file || busy) return;
    void run('processing', async () => {
      const image = await process(file);
      await store.save(image);
      return `Photo saved (${describeImage(image)}).`;
    });
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  return (
    <div
      data-testid="photo-drop-zone"
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      aria-busy={busy !== null}
      className={ui.joinClasses(
        'flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row',
        dragging ? 'border-accent bg-surface-2' : 'border-border',
      )}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md bg-backdrop sm:w-48">
        {url ? (
          preview(url)
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-fg-subtle">
            No photo
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-fg-subtle">
          {meta
            ? describeImage(meta)
            : 'Drop an image here or choose one. JPEG, PNG, WebP, AVIF or GIF, up to 25 MB.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            aria-label="Background photo file"
            className="sr-only"
            tabIndex={-1}
            onChange={e => {
              acceptFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
          >
            <FiImage aria-hidden />
            {busy === 'processing'
              ? 'Processing…'
              : url
                ? 'Replace photo'
                : 'Choose photo'}
          </Button>
          {url && (
            <Button
              onClick={() =>
                void run('removing', async () => {
                  await store.remove();
                  return 'Photo removed.';
                })
              }
              disabled={busy !== null}
            >
              <FiTrash2 aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${status ? ui.statusClass[status.tone] : ''}`}
        >
          {status?.text}
        </p>
      </div>
    </div>
  );
}
