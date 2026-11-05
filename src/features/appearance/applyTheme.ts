/**
 * Applies a theme to `<html>`. Preset tokens are set as inline `--color-*`
 * custom properties: inline styles beat every stylesheet rule, including
 * Tailwind's theme layer, with no specificity to manage, and a custom accent
 * needs an inline value anyway. `data-theme` is set too, as a styling hook.
 * The default theme (Stone) sets nothing, so the page is exactly as before.
 */
import {
  MIN_ACCENT_CONTRAST,
  parseColor,
  toHex,
  towardsContrast,
  type Rgb,
} from './color';
import {
  DEFAULT_PRESET_ID,
  presetById,
  TOKEN_NAMES,
  type PresetId,
  type ThemePreset,
} from './presets';
import {
  parseThemeSettings,
  resolvePresetId,
  type ThemeEnvironment,
  type ThemeSettings,
} from './themeSettings';

export {MIN_ACCENT_CONTRAST} from './color';

const WHITE: Rgb = {r: 1, g: 1, b: 1};
const BLACK: Rgb = {r: 0, g: 0, b: 0};

/** A custom accent as it will be drawn. */
export interface VisibleAccent {
  color: string;
  /** Lightened or darkened to stay visible on this theme. */
  adjusted: boolean;
}

/**
 * The custom `accent` lightened (dark themes) or darkened (light themes) just
 * enough to reach 3:1 against the theme's surface and backdrop.
 */
export function visibleAccent(
  accent: string,
  preset: ThemePreset,
): VisibleAccent {
  const base = parseColor(accent);
  if (!base) return {color: preset.tokens.accent, adjusted: true};
  const backgrounds = [preset.tokens.surface, preset.tokens.backdrop]
    .map(parseColor)
    .filter(color => color !== null);
  const target = preset.scheme === 'dark' ? WHITE : BLACK;
  const {color, amount} = towardsContrast(
    base,
    backgrounds,
    target,
    MIN_ACCENT_CONTRAST,
  );
  return amount === 0
    ? {color: accent, adjusted: false}
    : {color: toHex(color), adjusted: true};
}

/** Sets the preset's tokens (none for the default) and accent on `root`. */
export function applyTheme(
  root: HTMLElement,
  presetId: PresetId,
  accent?: string,
): void {
  const preset = presetById(presetId);
  const isDefault = preset.id === DEFAULT_PRESET_ID;
  for (const token of TOKEN_NAMES) {
    if (isDefault) root.style.removeProperty(`--color-${token}`);
    else root.style.setProperty(`--color-${token}`, preset.tokens[token]);
  }
  if (isDefault) {
    root.removeAttribute('data-theme');
    root.style.removeProperty('color-scheme');
  } else {
    root.dataset.theme = preset.id;
    root.style.colorScheme = preset.scheme;
  }
  if (accent) {
    root.style.setProperty(
      '--color-accent',
      visibleAccent(accent, preset).color,
    );
  }
  if (root.style.length === 0) root.removeAttribute('style');
}

/** `localStorage` key of the last saved theme settings, read before render. */
export const THEME_CACHE_KEY = 'new-tab-cache:appearance.theme';

/** Remembers the saved settings so the next page load can apply them early. */
export function writeThemeCache(settings: ThemeSettings, storage?: Storage) {
  try {
    (storage ?? window.localStorage).setItem(
      THEME_CACHE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Storage blocked or full: the next load just starts from the default
  }
}

function readThemeCache(storage?: Storage): ThemeSettings | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(THEME_CACHE_KEY);
    return raw === null ? null : parseThemeSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** The current colour-scheme preference and time. */
export function currentThemeEnvironment(): ThemeEnvironment {
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {prefersDark, now: new Date()};
}

/**
 * Applies the cached theme synchronously, before React renders, so the page
 * never flashes the default theme. Returns whether a cache was found.
 */
export function applyCachedTheme(
  root: HTMLElement = document.documentElement,
  environment: ThemeEnvironment = currentThemeEnvironment(),
  storage?: Storage,
): boolean {
  const settings = readThemeCache(storage);
  if (settings) {
    applyTheme(root, resolvePresetId(settings, environment), settings.accent);
  }
  return settings !== null;
}
