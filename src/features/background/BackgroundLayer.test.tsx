import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  createBackgroundImageStore,
  type BackgroundImageStore,
  type ImageBackend,
} from './backgroundImage';
import {BackgroundLayer, BackgroundPhoto} from './BackgroundLayer';
import {setDisplayPreview} from './displayPreview';
import type {StoredImage} from './imageStore';
import {TEST_PALETTE} from '../../test/photoFixtures';
import type {BackgroundDisplay} from './settings';

let urlCount = 0;
const revoked: string[] = [];

beforeEach(() => {
  urlCount = 0;
  revoked.length = 0;
  // jsdom has no object URLs; each test file has its own environment
  Object.assign(URL, {
    createObjectURL: () => `blob:photo-${++urlCount}`,
    revokeObjectURL: (url: string) => revoked.push(url),
  });
  localStorage.clear();
});

afterEach(() => setDisplayPreview(null));

function makeImage(): StoredImage {
  const blob = new Blob(['webp'], {type: 'image/webp'});
  return {
    blob,
    width: 100,
    height: 50,
    type: 'image/webp',
    byteSize: blob.size,
    updatedAt: 1,
    palette: TEST_PALETTE,
  };
}

/** An in-memory backend; `get` can be made to fail. */
function memoryBackend(initial: StoredImage | null = null) {
  let stored = initial;
  const backend: ImageBackend & {failGet?: Error; failPut?: Error} = {
    get: () =>
      backend.failGet
        ? Promise.reject(backend.failGet)
        : Promise.resolve(stored),
    put: image => {
      if (backend.failPut) return Promise.reject(backend.failPut);
      stored = image;
      return Promise.resolve();
    },
    remove: () => {
      stored = null;
      return Promise.resolve();
    },
  };
  return backend;
}

function photo() {
  return screen.getByTestId('background-layer').querySelector('img');
}

async function renderLoaded(store: BackgroundImageStore) {
  render(<BackgroundLayer store={store} />);
  await waitFor(() => expect(store.getState().loaded).toBe(true));
}

describe('BackgroundLayer', () => {
  it('renders nothing without a stored photo', async () => {
    await renderLoaded(createBackgroundImageStore(memoryBackend()));
    expect(screen.queryByTestId('background-layer')).toBeNull();
  });

  it('shows the stored photo behind the page, hidden from assistive tech', async () => {
    await renderLoaded(createBackgroundImageStore(memoryBackend(makeImage())));
    const layer = screen.getByTestId('background-layer');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.className).toContain('pointer-events-none');
    expect(layer.className).toContain('-z-10');
    expect(photo()?.getAttribute('src')).toBe('blob:photo-1');
    expect(photo()?.style.objectFit).toBe('cover');
    expect(photo()?.style.objectPosition).toBe('50% 50%');
  });

  it('falls back with one warning when storage cannot be read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const backend = memoryBackend(makeImage());
    backend.failGet = new Error('IndexedDB unavailable');
    await renderLoaded(createBackgroundImageStore(backend));
    expect(screen.queryByTestId('background-layer')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('falls back when the browser cannot display the blob', async () => {
    await renderLoaded(createBackgroundImageStore(memoryBackend(makeImage())));
    fireEvent.error(photo() as HTMLImageElement);
    expect(screen.queryByTestId('background-layer')).toBeNull();
    expect(revoked).toEqual(['blob:photo-1']);
  });

  it('swaps and revokes object URLs on save and remove', async () => {
    const store = createBackgroundImageStore(memoryBackend());
    await renderLoaded(store);
    await act(() => store.save(makeImage()));
    expect(photo()?.getAttribute('src')).toBe('blob:photo-1');
    await act(() => store.save(makeImage()));
    expect(photo()?.getAttribute('src')).toBe('blob:photo-2');
    expect(revoked).toEqual(['blob:photo-1']);
    await act(() => store.remove());
    expect(screen.queryByTestId('background-layer')).toBeNull();
    expect(revoked).toEqual(['blob:photo-1', 'blob:photo-2']);
  });

  it('draws the live preview instead of the saved options', async () => {
    await renderLoaded(createBackgroundImageStore(memoryBackend(makeImage())));
    act(() =>
      setDisplayPreview({
        fit: 'contain',
        focusX: 0,
        focusY: 100,
        dim: 40,
        blur: 10,
      }),
    );
    expect(photo()?.style.objectFit).toBe('contain');
    expect(photo()?.style.objectPosition).toBe('0% 100%');
    expect(photo()?.style.filter).toBe('blur(10px)');
    // A letterboxed photo isn't enlarged
    expect(photo()?.style.top).toBe('0px');
    const dim = photo()?.nextElementSibling as HTMLElement;
    expect(dim.style.opacity).toBe('0.4');
    act(() => setDisplayPreview(null));
    expect(photo()?.style.objectFit).toBe('cover');
  });
});

describe('BackgroundPhoto', () => {
  const display: BackgroundDisplay = {
    fit: 'cover',
    focusX: 50,
    focusY: 50,
    dim: 0,
    blur: 10,
  };

  it('bleeds a blurred, cropped photo past the edges', () => {
    render(<BackgroundPhoto url="blob:x" display={{...display}} />);
    const img = screen.getByRole('presentation');
    expect(img.style.top).toBe('-20px');
    expect(img.style.width).toBe('calc(100% + 40px)');
  });

  it('scales the blur down for a small preview', () => {
    render(<BackgroundPhoto url="blob:x" display={{...display}} scale={0.5} />);
    const img = screen.getByRole('presentation');
    expect(img.style.filter).toBe('blur(5px)');
    expect(img.style.top).toBe('-10px');
  });
});
