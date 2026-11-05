import {describe, expect, it, vi} from 'vitest';
import {
  BackgroundImageError,
  MAX_INPUT_BYTES,
  processImage,
  scaledSize,
  storageError,
  validateImageFile,
  type DecodedImage,
  type ImageCodec,
  type Size,
} from './imageProcessing';
import {PALETTE_SAMPLE_SIZE, type Pixels} from './photoPalette';

function fileInfo(name: string, type: string, size = 1000) {
  return {name, type, size};
}

describe('validateImageFile', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
    ['photo.avif', 'image/avif'],
    ['anim.gif', 'image/gif'],
    ['PHOTO.JPG', 'IMAGE/JPEG'],
    ['unknown', ''],
  ])('accepts %s (%s)', (name, type) => {
    expect(validateImageFile(fileInfo(name, type))).toBeNull();
  });

  it('rejects SVG by type or by name', () => {
    expect(validateImageFile(fileInfo('a.svg', 'image/svg+xml'))?.code).toBe(
      'svg',
    );
    expect(validateImageFile(fileInfo('a.svg', ''))?.code).toBe('svg');
  });

  it.each([
    ['doc.pdf', 'application/pdf'],
    ['icon.bmp', 'image/bmp'],
    ['notes.txt', 'text/plain'],
  ])('rejects %s as the wrong type', (name, type) => {
    const error = validateImageFile(fileInfo(name, type));
    expect(error?.code).toBe('type');
    expect(error?.message).toMatch(/JPEG, PNG, WebP, AVIF or GIF/);
  });

  it('accepts exactly 25 MB and rejects anything larger', () => {
    expect(
      validateImageFile(fileInfo('a.jpg', 'image/jpeg', MAX_INPUT_BYTES)),
    ).toBeNull();
    const error = validateImageFile(
      fileInfo('a.jpg', 'image/jpeg', 30 * 1024 * 1024),
    );
    expect(error?.code).toBe('size');
    expect(error?.message).toBe('That image is 30 MB; the limit is 25 MB.');
  });
});

describe('scaledSize', () => {
  it('keeps images that already fit', () => {
    expect(scaledSize({width: 1920, height: 1080})).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(scaledSize({width: 3840, height: 3840})).toEqual({
      width: 3840,
      height: 3840,
    });
  });

  it('scales a landscape image by its width', () => {
    expect(scaledSize({width: 7680, height: 4320})).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it('scales a portrait image by its height', () => {
    expect(scaledSize({width: 3000, height: 6000})).toEqual({
      width: 1920,
      height: 3840,
    });
  });

  it('rounds and never goes below 1 px', () => {
    expect(scaledSize({width: 5000, height: 3333})).toEqual({
      width: 3840,
      height: 2560,
    });
    expect(scaledSize({width: 100_000, height: 10}, 3840)).toEqual({
      width: 3840,
      height: 1,
    });
  });
});

class FakeImage implements DecodedImage {
  closed = false;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {}
  close() {
    this.closed = true;
  }
}

function flatPixels(size: Size, rgb: number[]): Pixels {
  const data = Array.from({length: size.width * size.height}, () => [
    ...rgb,
    255,
  ]).flat();
  return {...size, data};
}

function fakeCodec(image: FakeImage | Error, encodeError?: Error) {
  const encoded: Size[] = [];
  const sampled: Size[] = [];
  const codec: ImageCodec<FakeImage> = {
    decode: () =>
      image instanceof Error ? Promise.reject(image) : Promise.resolve(image),
    encode: (_, size) => {
      encoded.push(size);
      if (encodeError) return Promise.reject(encodeError);
      return Promise.resolve(new Blob(['webp'], {type: 'image/webp'}));
    },
    sample: (_, size) => {
      sampled.push(size);
      return Promise.resolve(flatPixels(size, [51, 102, 153]));
    },
  };
  return {codec, encoded, sampled};
}

function jpeg(size = 1000) {
  const file = new File(['x'], 'photo.jpg', {type: 'image/jpeg'});
  Object.defineProperty(file, 'size', {value: size});
  return file;
}

describe('processImage', () => {
  it('downscales, encodes and describes the result', async () => {
    const image = new FakeImage(6000, 4000);
    const {codec, encoded, sampled} = fakeCodec(image);
    const stored = await processImage(jpeg(), codec, () => 42);
    expect(encoded).toEqual([{width: 3840, height: 2560}]);
    expect(sampled).toEqual([PALETTE_SAMPLE_SIZE]);
    expect(stored).toMatchObject({
      width: 3840,
      height: 2560,
      type: 'image/webp',
      byteSize: 4,
      updatedAt: 42,
    });
    expect(stored.palette.average).toBe('#336699');
    expect(image.closed).toBe(true);
  });

  it('rejects an invalid file without decoding it', async () => {
    const decode = vi.fn();
    const codec = {decode, encode: vi.fn(), sample: vi.fn()};
    const svg = new File(['<svg/>'], 'a.svg', {type: 'image/svg+xml'});
    await expect(processImage(svg, codec)).rejects.toMatchObject({
      code: 'svg',
    });
    await expect(
      processImage(jpeg(MAX_INPUT_BYTES + 1), codec),
    ).rejects.toMatchObject({code: 'size'});
    expect(decode).not.toHaveBeenCalled();
  });

  it('reports an image that fails to decode', async () => {
    const {codec} = fakeCodec(new Error('bad data'));
    const error: unknown = await processImage(jpeg(), codec).catch(
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(BackgroundImageError);
    expect(error).toMatchObject({code: 'decode'});
  });

  it('reports a zero-sized image as undecodable', async () => {
    const image = new FakeImage(0, 0);
    await expect(
      processImage(jpeg(), fakeCodec(image).codec),
    ).rejects.toMatchObject({code: 'decode'});
    expect(image.closed).toBe(true);
  });

  it('reports an encoding failure and still releases the image', async () => {
    const image = new FakeImage(800, 600);
    const {codec} = fakeCodec(image, new Error('out of memory'));
    await expect(processImage(jpeg(), codec)).rejects.toMatchObject({
      code: 'encode',
    });
    expect(image.closed).toBe(true);
  });
});

describe('storageError', () => {
  it('explains a full disk', () => {
    const error = storageError(new DOMException('full', 'QuotaExceededError'));
    expect(error.code).toBe('quota');
    expect(error.message).toMatch(/enough storage space/);
  });

  it('wraps other failures', () => {
    expect(storageError(new Error('boom')).code).toBe('storage');
  });
});
