import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {createBackgroundImageStore, type ImageBackend} from './backgroundImage';
import {processImage, type ImageCodec} from './imageProcessing';
import type {StoredImage} from './imageStore';
import {PhotoPicker} from './PhotoPicker';

beforeEach(() => {
  let count = 0;
  // jsdom has no object URLs; each test file has its own environment
  Object.assign(URL, {
    createObjectURL: () => `blob:photo-${++count}`,
    revokeObjectURL: () => {},
  });
});

function memoryBackend(failPut?: Error): ImageBackend {
  let stored: StoredImage | null = null;
  return {
    get: () => Promise.resolve(stored),
    put: image => {
      if (failPut) return Promise.reject(failPut);
      stored = image;
      return Promise.resolve();
    },
    remove: () => {
      stored = null;
      return Promise.resolve();
    },
  };
}

/** A codec whose decode waits for `finish` (or fails when `broken`). */
function fakeCodec(broken = false) {
  const resolvers: Array<() => void> = [];
  const decoded = new Promise<void>(resolve => resolvers.push(resolve));
  const codec: ImageCodec<{width: number; height: number; close(): void}> = {
    decode: async () => {
      await decoded;
      if (broken) throw new Error('bad data');
      return {width: 6000, height: 4000, close: () => {}};
    },
    encode: () =>
      Promise.resolve(
        new Blob([new Uint8Array(1_200_000)], {type: 'image/webp'}),
      ),
  };
  return {codec, finish: () => resolvers.forEach(resolve => resolve())};
}

function renderPicker(options: {broken?: boolean; failPut?: Error} = {}) {
  const store = createBackgroundImageStore(memoryBackend(options.failPut));
  const {codec, finish} = fakeCodec(options.broken);
  render(
    <PhotoPicker
      store={store}
      process={file => processImage(file, codec)}
      preview={url => <img alt="Preview" src={url} />}
    />,
  );
  return {store, finish};
}

function choose(file: File) {
  fireEvent.change(screen.getByLabelText('Background photo file'), {
    target: {files: [file]},
  });
}

function sizedFile(name: string, type: string, size = 1000) {
  const file = new File(['x'], name, {type});
  Object.defineProperty(file, 'size', {value: size});
  return file;
}

describe('PhotoPicker', () => {
  it('starts empty with the accepted formats', async () => {
    renderPicker();
    expect(await screen.findByText('No photo')).toBeTruthy();
    expect(
      screen.getByText(/JPEG, PNG, WebP, AVIF or GIF, up to 25 MB/),
    ).toBeTruthy();
    expect(screen.queryByRole('button', {name: /Remove/})).toBeNull();
  });

  it('shows progress while processing, then the stored photo', async () => {
    const {finish, store} = renderPicker();
    choose(sizedFile('photo.jpg', 'image/jpeg'));
    const button = await screen.findByRole('button', {name: /Processing/});
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Resizing and compressing…')).toBeTruthy();
    finish();
    expect(
      await screen.findByText('Photo saved (3840 × 2560, 1.1 MB).'),
    ).toBeTruthy();
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe(
      store.getState().url,
    );
    expect(screen.getByRole('button', {name: /Replace photo/})).toBeTruthy();
  });

  it('accepts a dropped file', async () => {
    const {finish, store} = renderPicker();
    fireEvent.drop(screen.getByTestId('photo-drop-zone'), {
      dataTransfer: {files: [sizedFile('photo.png', 'image/png')]},
    });
    finish();
    await screen.findByText(/Photo saved/);
    expect(store.getState().url).not.toBeNull();
  });

  it('removes the photo', async () => {
    const {finish, store} = renderPicker();
    choose(sizedFile('photo.jpg', 'image/jpeg'));
    finish();
    await screen.findByText(/Photo saved/);
    fireEvent.click(screen.getByRole('button', {name: /Remove/}));
    expect(await screen.findByText('Photo removed.')).toBeTruthy();
    expect(store.getState().url).toBeNull();
    expect(screen.getByText('No photo')).toBeTruthy();
  });

  it.each([
    [
      'an SVG',
      sizedFile('logo.svg', 'image/svg+xml'),
      /SVG images aren’t supported/,
    ],
    [
      'a PDF',
      sizedFile('doc.pdf', 'application/pdf'),
      /isn’t a supported image/,
    ],
    [
      'a 30 MB file',
      sizedFile('big.jpg', 'image/jpeg', 30 * 1024 * 1024),
      /30 MB; the limit is 25 MB/,
    ],
  ])('explains why %s is rejected', async (_, file, message) => {
    renderPicker();
    choose(file);
    expect(await screen.findByText(message)).toBeTruthy();
  });

  it('explains an image that cannot be decoded', async () => {
    const {finish} = renderPicker({broken: true});
    choose(sizedFile('photo.jpg', 'image/jpeg'));
    finish();
    expect(await screen.findByText(/couldn’t be read/)).toBeTruthy();
    expect(screen.getByText('No photo')).toBeTruthy();
  });

  it('explains a full disk', async () => {
    const {finish} = renderPicker({
      failPut: new DOMException('full', 'QuotaExceededError'),
    });
    choose(sizedFile('photo.jpg', 'image/jpeg'));
    finish();
    expect(await screen.findByText(/isn’t enough storage space/)).toBeTruthy();
  });
});
