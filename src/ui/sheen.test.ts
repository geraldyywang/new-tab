import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {watchSheen} from './sheen';

const root = document.documentElement;
let frames: FrameRequestCallback[] = [];
let stop: (() => void) | undefined;

function surface() {
  const card = document.createElement('div');
  card.dataset.surface = 'solid';
  const text = document.createElement('p');
  card.append(text);
  document.body.append(card);
  card.getBoundingClientRect = () => new DOMRect(100, 50, 400, 200);
  return {card, text};
}

function move(target: Element, clientX: number, clientY: number) {
  // jsdom has no PointerEvent; the handler only reads these fields
  target.dispatchEvent(
    new MouseEvent('pointermove', {bubbles: true, clientX, clientY}),
  );
}

function runFrames() {
  const pending = frames;
  frames = [];
  pending.forEach(callback => callback(0));
}

function prefersReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({matches}));
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  prefersReducedMotion(false);
  root.dataset.surfaceStyle = 'glass';
});

afterEach(() => {
  stop?.();
  vi.unstubAllGlobals();
  root.removeAttribute('data-surface-style');
  document.body.replaceChildren();
});

describe('watchSheen', () => {
  it('follows the pointer over a surface, once a frame', () => {
    stop = watchSheen();
    const {card, text} = surface();
    move(text, 150, 80);
    move(text, 180, 90);
    expect(frames).toHaveLength(1);
    expect(card.style.getPropertyValue('--sheen-x')).toBe('');
    runFrames();
    expect(card.style.getPropertyValue('--sheen-x')).toBe('80px');
    expect(card.style.getPropertyValue('--sheen-y')).toBe('40px');
  });

  it('lets the sheen go back when the pointer leaves the surface', () => {
    stop = watchSheen();
    const {card} = surface();
    move(card, 150, 80);
    runFrames();
    move(document.body, 10, 10);
    runFrames();
    expect(card.style.getPropertyValue('--sheen-x')).toBe('');
  });

  it.each([
    ['another surface style', () => (root.dataset.surfaceStyle = 'frosted')],
    ['reduced motion', () => prefersReducedMotion(true)],
  ])('stays still with %s', (_, setUp) => {
    setUp();
    stop = watchSheen();
    const {card} = surface();
    move(card, 150, 80);
    expect(frames).toHaveLength(0);
    expect(card.style.getPropertyValue('--sheen-x')).toBe('');
  });

  it('stops watching', () => {
    stop = watchSheen();
    stop();
    const {card} = surface();
    move(card, 150, 80);
    expect(frames).toHaveLength(0);
  });
});
