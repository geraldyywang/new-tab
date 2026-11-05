import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  installRefraction,
  REFRACTION_FILTER_ID,
  supportsRefraction,
} from './refraction';

const root = document.documentElement;

afterEach(() => {
  vi.unstubAllGlobals();
  root.removeAttribute('data-refraction');
  document.body.replaceChildren();
});

describe('installRefraction', () => {
  it('adds the filter and flags <html> where supported', () => {
    expect(installRefraction(document, true)).toBe(true);
    expect(root.hasAttribute('data-refraction')).toBe(true);
    const filter = document.getElementById(REFRACTION_FILTER_ID);
    expect(filter?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(filter?.querySelector('feTurbulence')).not.toBeNull();
    expect(filter?.querySelector('feDisplacementMap')).not.toBeNull();
  });

  it('leaves the plain blur where unsupported', () => {
    expect(installRefraction(document, false)).toBe(false);
    expect(root.hasAttribute('data-refraction')).toBe(false);
    expect(document.body.children).toHaveLength(0);
  });
});

describe('supportsRefraction', () => {
  it('asks CSS whether backdrop-filter takes an SVG filter', () => {
    const supports = vi.fn(() => true);
    vi.stubGlobal('CSS', {supports});
    expect(supportsRefraction()).toBe(true);
    expect(supports).toHaveBeenCalledWith(
      'backdrop-filter',
      `url(#${REFRACTION_FILTER_ID})`,
    );
  });

  it('is false without CSS.supports', () => {
    vi.stubGlobal('CSS', undefined);
    expect(supportsRefraction()).toBe(false);
  });
});
