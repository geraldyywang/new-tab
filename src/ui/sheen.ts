/**
 * Moves the liquid glass sheen with the pointer: while the pointer moves
 * over a surface, its `--sheen-x` and `--sheen-y` follow it, at most once a
 * frame (src/ui/surfaces.css draws the sheen there and eases it along).
 * Nothing runs while the pointer rests. Under `prefers-reduced-motion`, or
 * with another surface style, the sheen stays where the stylesheet puts it.
 */

const SURFACE = '[data-surface]';

function clear(surface: HTMLElement) {
  surface.style.removeProperty('--sheen-x');
  surface.style.removeProperty('--sheen-y');
}

/** Starts following the pointer in `doc`; returns a function that stops. */
export function watchSheen(doc: Document = document): () => void {
  const root = doc.documentElement;
  const view = doc.defaultView ?? window;
  const reducedMotion =
    typeof view.matchMedia === 'function'
      ? view.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  let frame = 0;
  let pending: PointerEvent | null = null;
  let lit: HTMLElement | null = null;

  function paint() {
    frame = 0;
    const event = pending;
    pending = null;
    if (!event) return;
    const target = event.target instanceof Element ? event.target : null;
    const surface = target?.closest<HTMLElement>(SURFACE) ?? null;
    if (lit && lit !== surface) clear(lit);
    lit = surface;
    if (!surface) return;
    const box = surface.getBoundingClientRect();
    surface.style.setProperty('--sheen-x', `${event.clientX - box.left}px`);
    surface.style.setProperty('--sheen-y', `${event.clientY - box.top}px`);
  }

  function onMove(event: PointerEvent) {
    if (root.dataset.surfaceStyle !== 'glass' || reducedMotion?.matches) {
      return;
    }
    pending = event;
    if (!frame) frame = view.requestAnimationFrame(paint);
  }

  // Leaving the page lets the sheen drift back to where the light rests
  function onLeave() {
    if (lit) clear(lit);
    lit = null;
  }

  doc.addEventListener('pointermove', onMove, {passive: true});
  doc.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    doc.removeEventListener('pointermove', onMove);
    doc.documentElement.removeEventListener('pointerleave', onLeave);
    if (frame) view.cancelAnimationFrame(frame);
    onLeave();
  };
}
