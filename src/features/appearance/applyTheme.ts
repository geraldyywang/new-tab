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
  GLASS_TOKEN_NAMES,
  GLASS_LIT,
  glassLightTokens,
  glassTokens,
  type PaneTokenName,
} from './glassTokens';
import {photoTokens, PHOTO_TOKEN_NAMES, type PhotoTheme} from './photoTokens';
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
  type ThemeEnvironment,
  type ThemeSettings,
} from './themeSettings';

export {MIN_ACCENT_CONTRAST} from '../../theme/color';

const WHITE: Rgb = {r: 1, g: 1, b: 1};
const BLACK: Rgb = {r: 0, g: 0, b: 0};

/** What the theme settings decide besides the preset. */
export type ThemeLook = Partial<
  Pick<ThemeSettings, 'accent' | 'surface' | 'surfaceOpacity'>
>;

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

/** Pane tokens, and how the panes came out. */
export type PaneTheme = Omit<PhotoTheme, 'tokens'> & {
  tokens: Partial<Record<PaneTokenName, string>>;
};

/**
 * Tokens of see-through or photo panes: tinted by the `photo` if there is
 * one, else the preset's own surfaces made translucent. `opacity` is the
 * card opacity in %, `null` for Auto; `surface` adds liquid glass's light.
 */
export function paneTheme(
  preset: ThemePreset,
  {accent, surface = 'solid'}: ThemeLook,
  opacity: number | null,
  photo?: PhotoBackdrop | null,
): PaneTheme {
  const fraction = opacity === null ? null : opacity / 100;
  const glass = surface === 'glass';
  const lit = glass ? GLASS_LIT : undefined;
  let theme: PaneTheme;
  if (photo) {
    theme = photoTokens(photo, preset, accent, fraction, lit);
  } else {
    const drawn = accent ? visibleAccent(accent, preset).color : undefined;
    const {scheme} = preset;
    theme = glassTokens(
      preset,
      drawn ?? preset.tokens.accent,
      fraction,
      lit?.[scheme],
    );
  }
  if (!glass) return theme;
  const light = glassLightTokens(theme.scheme);
  return {...theme, tokens: {...theme.tokens, ...light}};
}

/**
 * Sets the preset's tokens (none for the default) and accent on `root`. With
 * a background `photo`, its tokens replace the preset's and `data-photo` is
 * set to the pane scheme; without one, both are cleared again. A surface
 * style other than solid is set as `data-surface-style`, with translucent
 * panes; solid panes over a photo are opaque.
 */
export function applyTheme(
  root: HTMLElement,
  presetId: PresetId,
  look: ThemeLook = {},
  photo?: PhotoBackdrop | null,
): void {
  const {accent, surface = 'solid', surfaceOpacity = null} = look;
  const preset = presetById(presetId);
  const isDefault = preset.id === DEFAULT_PRESET_ID;
  const solid = surface === 'solid';
  const panes =
    photo || !solid
      ? paneTheme(preset, look, solid ? 100 : surfaceOpacity, photo)
      : null;
  let tokens: Partial<Record<PaneTokenName, string>> = {};
  if (panes) tokens = panes.tokens;
  else if (!isDefault) tokens = {...preset.tokens};
  if (!panes && accent) tokens.accent = visibleAccent(accent, preset).color;
  const names = [...TOKEN_NAMES, ...PHOTO_TOKEN_NAMES, ...GLASS_TOKEN_NAMES];
  for (const token of names) {
    const value = tokens[token];
    if (value === undefined) root.style.removeProperty(`--color-${token}`);
    else root.style.setProperty(`--color-${token}`, value);
  }
  if (photo && panes) root.dataset.photo = panes.scheme;
  else root.removeAttribute('data-photo');
  if (panes && !panes.legible) root.dataset.surfaceLegible = 'false';
  else root.removeAttribute('data-surface-legible');
  if (solid) root.removeAttribute('data-surface-style');
  else root.dataset.surfaceStyle = surface;
  if (isDefault) {
    root.removeAttribute('data-theme');
    root.style.removeProperty('color-scheme');
  } else {
    root.dataset.theme = preset.id;
    root.style.colorScheme = preset.scheme;
  }
  if (panes) root.style.colorScheme = panes.scheme;
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
    const look = settings ?? DEFAULT_THEME_SETTINGS;
    applyTheme(root, resolvePresetId(look, environment), look, photo);
  }
  return settings !== null;
}
