/**
 * Refraction for liquid glass: an SVG filter that bends what lies behind a
 * surface near its edges, as the thick rim of a glass pane would. Noise
 * (feTurbulence) displaces the blurred backdrop (feDisplacementMap) within a
 * soft band along the edges; the middle of the pane, where most text sits,
 * stays still. src/ui/surfaces.css adds it to the backdrop filter only where
 * `<html data-refraction>` says the browser takes SVG filters there; others
 * keep the plain blur.
 */

/** Id of the filter, as `backdrop-filter: url(#...)` names it. */
export const REFRACTION_FILTER_ID = 'glass-refraction';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Sizes are fractions of the surface (objectBoundingBox): neutral grey,
// which displaces nothing, covers all but an 8% band along the edges, and a
// blur softens where the band begins. Chromium ignores SourceAlpha and
// feMorphology here, so the band can't be a fixed width.
const FILTER = `
<filter id="${REFRACTION_FILTER_ID}" x="0" y="0" width="1" height="1"
    primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="2"
      seed="7" result="noise" />
  <feFlood flood-color="gray" x="0.08" y="0.08" width="0.84" height="0.84"
      result="still" />
  <feMerge result="map">
    <feMergeNode in="noise" />
    <feMergeNode in="still" />
  </feMerge>
  <feGaussianBlur in="map" stdDeviation="0.02" result="soft" />
  <feDisplacementMap in="SourceGraphic" in2="soft" scale="0.1"
      xChannelSelector="R" yChannelSelector="G" />
</filter>`;

/** Whether this browser applies SVG filters in `backdrop-filter`. */
export function supportsRefraction(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('backdrop-filter', `url(#${REFRACTION_FILTER_ID})`)
  );
}

/**
 * Adds the filter to `doc` and sets `data-refraction` on `<html>`, if the
 * browser supports it. Returns whether it did.
 */
export function installRefraction(
  doc: Document = document,
  supported = supportsRefraction(),
): boolean {
  if (!supported) return false;
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = FILTER;
  doc.body.append(svg);
  doc.documentElement.dataset.refraction = '';
  return true;
}
