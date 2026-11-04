import {WEBP_QUALITY, type ImageCodec, type Size} from './imageProcessing';

function drawScaled(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  bitmap: ImageBitmap,
  {width, height}: Size,
) {
  if (!context) throw new Error('No 2D canvas context');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
}

async function encode(bitmap: ImageBitmap, size: Size): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(size.width, size.height);
    drawScaled(canvas.getContext('2d'), bitmap, size);
    return canvas.convertToBlob({type: 'image/webp', quality: WEBP_QUALITY});
  }
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  drawScaled(canvas.getContext('2d'), bitmap, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/webp',
      WEBP_QUALITY,
    );
  });
}

/**
 * Decodes with `createImageBitmap` (EXIF orientation applied; a GIF gives its
 * first frame) and encodes on an `OffscreenCanvas`, or a `<canvas>` where
 * that is missing.
 */
export const BROWSER_CODEC: ImageCodec<ImageBitmap> = {
  decode: blob => createImageBitmap(blob, {imageOrientation: 'from-image'}),
  encode,
};
