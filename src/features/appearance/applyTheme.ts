/**
 * Applies a theme to `<html>`. Preset tokens are set as inline `--color-*`
 * custom properties: inline styles beat every stylesheet rule, including
 * Tailwind's theme layer, with no specificity to manage, and a custom accent
 * needs an inline value anyway. `data-theme` is set too, as a styling hook.
 * The default theme (Stone) sets nothing, so the page is exactly as before.
 */
import {readPhotoCache, type PhotoBackdrop} from '../../theme/photoBackdrop';
import {
  MIN_ACCENT_CONTRAST,
  parseColor,
  toHex,
  towardsContrast,
  type Rgb,
} from '../../theme/color';
import {
  photoTokens,
  PHOTO_TOKEN_NAMES,
  type PhotoTokenName,
} from './photoTokens';
import {
  DEFAULT_PRESET_ID,
  presetById,
  TOKEN_NAMES,
  type PresetId,
  type ThemePreset,
} from './presets';
import {
  DEFAULT_THEME_SETTINGS,
  parseThemeSettings,
  resolvePresetId,
  type SurfaceStyle,
  type ThemeEnvironment,
  type ThemeSettings,
} from './themeSettings';

export {MIN_ACCENT_CONTRAST} from '../../theme/color';

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

/**
 * Sets the preset's tokens (none for the default) and accent on `root`. With
 * a background `photo`, its tokens replace the preset's and `data-photo` is
 * set to the pane scheme; without one, both are cleared again. A `surface`
 * style other than solid is set as `data-surface-style`; solid panes over a
 * photo are opaque.
 */
export function applyTheme(
  root: HTMLElement,
  presetId: PresetId,
  accent?: string,
  photo?: PhotoBackdrop | null,
  surface: SurfaceStyle = 'solid',
): void {
  const preset = presetById(presetId);
  const isDefault = preset.id === DEFAULT_PRESET_ID;
  const panes =
    surface === 'solid' && photo ? {...photo, paneOpacity: 1} : photo;
  const photoTheme = panes ? photoTokens(panes, preset, accent) : null;
  let tokens: Partial<Record<PhotoTokenName, string>> = {};
  if (photoTheme) tokens = photoTheme.tokens;
  else if (!isDefault) tokens = {...preset.tokens};
  if (!photo && accent) tokens.accent = visibleAccent(accent, preset).color;
  for (const token of [...TOKEN_NAMES, ...PHOTO_TOKEN_NAMES]) {
    const value = tokens[token];
    if (value === undefined) root.style.removeProperty(`--color-${token}`);
    else root.style.setProperty(`--color-${token}`, value);
  }
  if (photoTheme) root.dataset.photo = photoTheme.scheme;
  else root.removeAttribute('data-photo');
  if (photoTheme && !photoTheme.legible) root.dataset.photoLegible = 'false';
  else root.removeAttribute('data-photo-legible');
  if (surface === 'solid') root.removeAttribute('data-surface-style');
  else root.dataset.surfaceStyle = surface;
  if (isDefault) {
    root.removeAttribute('data-theme');
    root.style.removeProperty('color-scheme');
  } else {
    root.dataset.theme = preset.id;
    root.style.colorScheme = preset.scheme;
  }
  if (photoTheme) root.style.colorScheme = photoTheme.scheme;
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
 * Applies the cached theme and photo backdrop synchronously, before React
 * renders, so the page never flashes the default theme or solid cards.
 * Returns whether a theme cache was found.
 */
export function applyCachedTheme(
  root: HTMLElement = document.documentElement,
  environment: ThemeEnvironment = currentThemeEnvironment(),
  storage?: Storage,
): boolean {
  const settings = readThemeCache(storage);
  const photo = readPhotoCache(storage);
  if (settings || photo) {
    const {accent, surface} = settings ?? DEFAULT_THEME_SETTINGS;
    const presetId = resolvePresetId(
      settings ?? DEFAULT_THEME_SETTINGS,
      environment,
    );
    applyTheme(root, presetId, accent, photo, surface);
  }
  return settings !== null;
}
