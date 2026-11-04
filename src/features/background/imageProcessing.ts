/**
 * Turns a user's image file into the photo we store: validate, decode,
 * downscale and re-encode as WebP. Decoding and encoding go through an
 * injected `ImageCodec` (see `browserCodec.ts`), so the pipeline is testable
 * without a real canvas.
 */
import type {StoredImage} from './imageStore';

/** Largest file accepted, before processing. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Stored photos are downscaled so their longer side is at most this. */
export const MAX_LONG_EDGE = 3840;
/** WebP quality used when re-encoding. */
export const WEBP_QUALITY = 0.85;

/** MIME types accepted for upload (GIFs keep their first frame). */
export const ACCEPTED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

/** Why an image couldn't be used as the background. */
export type BackgroundImageErrorCode =
  'svg' | 'type' | 'size' | 'decode' | 'encode' | 'quota' | 'storage';

/** A failure with a message that can be shown to the user. */
export class BackgroundImageError extends Error {
  constructor(
    readonly code: BackgroundImageErrorCode,
    message: string,
    options?: {cause?: unknown},
  ) {
    super(message, options);
    this.name = 'BackgroundImageError';
  }
}

/** The parts of a `File` that validation looks at. */
export interface FileInfo {
  name: string;
  type: string;
  size: number;
}

/** Checks type and size before decoding; returns the problem, if any. */
export function validateImageFile(file: FileInfo): BackgroundImageError | null {
  const type = file.type.toLowerCase();
  if (type === 'image/svg+xml' || /\.svgz?$/i.test(file.name)) {
    return new BackgroundImageError(
      'svg',
      'SVG images aren’t supported. Use a JPEG, PNG, WebP, AVIF or GIF.',
    );
  }
  // Some systems report no type; let the decoder decide for those
  if (type !== '' && !ACCEPTED_TYPES.includes(type)) {
    return new BackgroundImageError(
      'type',
      'That file isn’t a supported image. Use a JPEG, PNG, WebP, AVIF or GIF.',
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    const megabytes = Math.round(file.size / (1024 * 1024));
    return new BackgroundImageError(
      'size',
      `That image is ${megabytes} MB; the limit is 25 MB.`,
    );
  }
  return null;
}

/** Pixel dimensions. */
export interface Size {
  width: number;
  height: number;
}

/**
 * The size to store an image at: unchanged if its longer side fits within
 * `maxLongEdge`, otherwise scaled down proportionally (never below 1 px).
 */
export function scaledSize(size: Size, maxLongEdge = MAX_LONG_EDGE): Size {
  const longEdge = Math.max(size.width, size.height);
  if (longEdge <= maxLongEdge) return {width: size.width, height: size.height};
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** A decoded image, such as an `ImageBitmap`. */
export interface DecodedImage {
  readonly width: number;
  readonly height: number;
  close(): void;
}

/** Decodes and encodes images (a canvas in the browser, fakes in tests). */
export interface ImageCodec<T extends DecodedImage> {
  decode(blob: Blob): Promise<T>;
  /** Draws `image` at `size` and encodes it as WebP. */
  encode(image: T, size: Size): Promise<Blob>;
}

/**
 * Validates, decodes, downscales and re-encodes `file`. Rejects with a
 * `BackgroundImageError`.
 */
export async function processImage<T extends DecodedImage>(
  file: File,
  codec: ImageCodec<T>,
  now: () => number = Date.now,
): Promise<StoredImage> {
  const invalid = validateImageFile(file);
  if (invalid) throw invalid;

  let image: T;
  try {
    image = await codec.decode(file);
  } catch (err) {
    throw new BackgroundImageError(
      'decode',
      'That image couldn’t be read. It may be damaged or in an unsupported format.',
      {cause: err},
    );
  }

  try {
    if (image.width <= 0 || image.height <= 0) {
      throw new BackgroundImageError('decode', 'That image is empty.');
    }
    const size = scaledSize(image);
    const blob = await codec.encode(image, size);
    return {
      blob,
      ...size,
      type: blob.type,
      byteSize: blob.size,
      updatedAt: now(),
    };
  } catch (err) {
    if (err instanceof BackgroundImageError) throw err;
    throw new BackgroundImageError(
      'encode',
      'That image couldn’t be processed. Try a smaller image.',
      {cause: err},
    );
  } finally {
    image.close();
  }
}

/** Wraps an IndexedDB failure in a `BackgroundImageError`. */
export function storageError(err: unknown): BackgroundImageError {
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return new BackgroundImageError(
      'quota',
      'There isn’t enough storage space on this computer for that photo.',
      {cause: err},
    );
  }
  return new BackgroundImageError(
    'storage',
    'The photo couldn’t be saved on this computer.',
    {cause: err},
  );
}
