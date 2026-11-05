// The background feature reads its photo from IndexedDB, which jsdom lacks
import 'fake-indexeddb/auto';
import {act, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {clearSlicePreview, setSlicePreview} from '../../settings/slicePreview';
import {saveSlice} from '../../settings/slices';
import {THEME_CACHE_KEY} from './applyTheme';
import {
  DEFAULT_THEME_SETTINGS,
  themeSlice,
  type ThemeSettings,
} from './themeSettings';
import {ThemeSync} from './ThemeSync';
import {watchTheme} from './watchTheme';

const root = document.documentElement;

const SCHEDULED: ThemeSettings = {
  ...DEFAULT_THEME_SETTINGS,
  mode: 'scheduled',
  lightPreset: 'light',
  darkPreset: 'nord',
  lightFrom: 7 * 60,
  lightUntil: 19 * 60,
};

afterEach(() => {
  vi.useRealTimers();
  clearSlicePreview(themeSlice);
  root.removeAttribute('style');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-photo');
  window.localStorage.clear();
});

describe('watchTheme', () => {
  it('switches at the scheduled time', () => {
    vi.useFakeTimers({now: new Date(2026, 10, 4, 18, 59, 30)});
    const stop = watchTheme(root, SCHEDULED);
    expect(root.dataset.theme).toBe('light');

    vi.advanceTimersByTime(29_000);
    expect(root.dataset.theme).toBe('light');
    vi.advanceTimersByTime(2_000);
    expect(root.dataset.theme).toBe('nord');
    stop();
  });

  it('re-evaluates when the page becomes visible', () => {
    vi.useFakeTimers({now: new Date(2026, 10, 4, 12)});
    const stop = watchTheme(root, SCHEDULED);
    expect(root.dataset.theme).toBe('light');

    // The machine slept past the switch time without the timer firing
    vi.setSystemTime(new Date(2026, 10, 4, 21));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(root.dataset.theme).toBe('nord');
    stop();
  });

  it('stops watching', () => {
    vi.useFakeTimers({now: new Date(2026, 10, 4, 18, 59)});
    watchTheme(root, SCHEDULED)();
    vi.advanceTimersByTime(120_000);
    expect(root.dataset.theme).toBe('light');
  });
});

describe('ThemeSync', () => {
  it('applies the saved theme, previews, and caches only saved values', async () => {
    render(<ThemeSync />);
    await act(() =>
      saveSlice(themeSlice, {...DEFAULT_THEME_SETTINGS, preset: 'dracula'}),
    );
    await waitFor(() => expect(root.dataset.theme).toBe('dracula'));
    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toContain('dracula');

    act(() =>
      setSlicePreview(themeSlice, {...DEFAULT_THEME_SETTINGS, preset: 'nord'}),
    );
    expect(root.dataset.theme).toBe('nord');
    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toContain('dracula');

    act(() => clearSlicePreview(themeSlice));
    expect(root.dataset.theme).toBe('dracula');
  });
});
