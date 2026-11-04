import {
  BACKGROUND_IMAGE,
  useBackgroundImage,
  type BackgroundImageStore,
} from './backgroundImage';
import {useBackgroundDisplay} from './displayPreview';
import type {BackgroundDisplay} from './settings';

interface BackgroundPhotoProps {
  url: string;
  display: BackgroundDisplay;
  onError?: () => void;
}

/**
 * The photo with its fit, focal point, blur and dim applied, filling its
 * nearest positioned ancestor.
 */
export function BackgroundPhoto({url, display, onError}: BackgroundPhotoProps) {
  // Blur fades the edges; draw the image larger so they stay off-screen
  const bleed = display.blur * 2;
  return (
    <>
      <img
        src={url}
        alt=""
        draggable={false}
        onError={onError}
        className="absolute max-w-none"
        style={{
          top: -bleed,
          left: -bleed,
          width: `calc(100% + ${bleed * 2}px)`,
          height: `calc(100% + ${bleed * 2}px)`,
          objectFit: display.fit,
          objectPosition: `${display.focusX}% ${display.focusY}%`,
          filter: display.blur ? `blur(${display.blur}px)` : undefined,
        }}
      />
      {display.dim > 0 && (
        <div
          className="absolute inset-0 bg-dim"
          style={{opacity: display.dim / 100}}
        />
      )}
    </>
  );
}

/**
 * The user's photo behind all UI. Renders nothing without one, so the theme
 * backdrop on `<body>` shows; a blob the browser can't display falls back to
 * it too.
 */
export function BackgroundLayer({
  store = BACKGROUND_IMAGE,
}: {
  /** Photo source; the page's stored photo unless a test passes one. */
  store?: BackgroundImageStore;
}) {
  const {url} = useBackgroundImage(store);
  const display = useBackgroundDisplay();
  if (!url) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="background-layer"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      <BackgroundPhoto url={url} display={display} onError={store.markBroken} />
    </div>
  );
}
