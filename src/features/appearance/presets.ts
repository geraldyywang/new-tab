/**
 * Theme presets: each is a full map of the semantic colour tokens defined in
 * src/theme/tokens.css. This is the only file outside tokens.css allowed to
 * hold colour values (the token guard test skips it).
 */

/** Every overridable `--color-*` token (all but `scrim`). */
export const TOKEN_NAMES = [
  'backdrop',
  'surface',
  'surface-2',
  'surface-3',
  'surface-inset',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-faint',
  'border',
  'accent',
  'danger',
  'success',
  'warning',
  'warning-fg',
] as const;

/** A semantic colour token, without the `--color-` prefix. */
export type TokenName = (typeof TOKEN_NAMES)[number];

/** A value for every token. */
export type TokenMap = Readonly<Record<TokenName, string>>;

/** Ids of the built-in themes. */
export type PresetId =
  'stone' | 'light' | 'nord' | 'dracula' | 'catppuccin-mocha' | 'high-contrast';

/** A built-in theme. */
export interface ThemePreset {
  id: PresetId;
  name: string;
  /** Native controls (pickers, scrollbars) follow this. */
  scheme: 'light' | 'dark';
  tokens: TokenMap;
}

/** The default theme; applying it sets no overrides at all. */
export const DEFAULT_PRESET_ID: PresetId = 'stone';

/**
 * Stone's values as tokens.css resolves them through Tailwind's palette, for
 * contrast checks and swatches only. A test keeps them in step.
 */
const STONE: TokenMap = {
  backdrop: 'oklch(26.8% 0.007 34.298)',
  surface: 'oklch(20.5% 0 none)',
  'surface-2': 'oklch(26.9% 0 none)',
  'surface-3': 'oklch(37.1% 0 none)',
  'surface-inset': 'oklch(14.5% 0 none)',
  fg: 'oklch(87% 0 none)',
  'fg-muted': 'oklch(70.8% 0 none)',
  'fg-subtle': 'oklch(55.6% 0 none)',
  'fg-faint': 'oklch(43.9% 0 none)',
  border: 'oklch(37.1% 0 none)',
  accent: 'oklch(55.6% 0 none)',
  danger: 'oklch(70.4% 0.191 22.216)',
  success: 'oklch(76.5% 0.177 163.223)',
  warning: 'oklch(87.9% 0.169 91.605)',
  'warning-fg': 'oklch(92.4% 0.12 95.746)',
};

/** Every built-in theme, in picker order. */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {id: 'stone', name: 'Stone', scheme: 'dark', tokens: STONE},
  {
    id: 'light',
    name: 'Light',
    scheme: 'light',
    tokens: {
      backdrop: '#e7e5e4',
      surface: '#ffffff',
      'surface-2': '#f0f0f0',
      'surface-3': '#e2e2e2',
      'surface-inset': '#fafafa',
      fg: '#262626',
      'fg-muted': '#404040',
      'fg-subtle': '#525252',
      'fg-faint': '#8a8a8a',
      border: '#d4d4d4',
      accent: '#737373',
      danger: '#b91c1c',
      success: '#047857',
      warning: '#d97706',
      'warning-fg': '#92400e',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    scheme: 'dark',
    tokens: {
      backdrop: '#3b4252',
      surface: '#2e3440',
      'surface-2': '#434c5e',
      'surface-3': '#4c566a',
      'surface-inset': '#272c36',
      fg: '#eceff4',
      'fg-muted': '#d8dee9',
      'fg-subtle': '#aeb6c4',
      'fg-faint': '#7b88a1',
      border: '#4c566a',
      accent: '#88c0d0',
      danger: '#e5939a',
      success: '#a3be8c',
      warning: '#ebcb8b',
      'warning-fg': '#ebcb8b',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    scheme: 'dark',
    tokens: {
      backdrop: '#282a36',
      surface: '#21222c',
      'surface-2': '#343746',
      'surface-3': '#44475a',
      'surface-inset': '#191a21',
      fg: '#f8f8f2',
      'fg-muted': '#e2e2dc',
      'fg-subtle': '#b4b8cf',
      'fg-faint': '#6272a4',
      border: '#44475a',
      accent: '#bd93f9',
      danger: '#ff6e6e',
      success: '#50fa7b',
      warning: '#ffb86c',
      'warning-fg': '#f1fa8c',
    },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    scheme: 'dark',
    tokens: {
      backdrop: '#1e1e2e',
      surface: '#181825',
      'surface-2': '#313244',
      'surface-3': '#45475a',
      'surface-inset': '#11111b',
      fg: '#cdd6f4',
      'fg-muted': '#bac2de',
      'fg-subtle': '#a6adc8',
      'fg-faint': '#7f849c',
      border: '#45475a',
      accent: '#cba6f7',
      danger: '#f38ba8',
      success: '#a6e3a1',
      warning: '#fab387',
      'warning-fg': '#f9e2af',
    },
  },
  {
    id: 'high-contrast',
    name: 'High contrast',
    scheme: 'dark',
    tokens: {
      backdrop: '#000000',
      surface: '#141414',
      'surface-2': '#2b2b2b',
      'surface-3': '#404040',
      'surface-inset': '#000000',
      fg: '#ffffff',
      'fg-muted': '#ffffff',
      'fg-subtle': '#ebebeb',
      'fg-faint': '#b8b8b8',
      border: '#d6d6d6',
      accent: '#ffd400',
      danger: '#ff8080',
      success: '#5cff8f',
      warning: '#ffd400',
      'warning-fg': '#ffe566',
    },
  },
];

/** Accent swatches offered next to the custom colour picker. */
export const ACCENT_PRESETS: ReadonlyArray<{name: string; color: string}> = [
  {name: 'Blue', color: '#60a5fa'},
  {name: 'Teal', color: '#2dd4bf'},
  {name: 'Green', color: '#4ade80'},
  {name: 'Amber', color: '#fbbf24'},
  {name: 'Rose', color: '#fb7185'},
  {name: 'Violet', color: '#a78bfa'},
];

/** Whether `value` names a built-in theme. */
export function isPresetId(value: unknown): value is PresetId {
  return THEME_PRESETS.some(preset => preset.id === value);
}

/** The preset with this id. */
export function presetById(id: PresetId): ThemePreset {
  return THEME_PRESETS.find(preset => preset.id === id) ?? THEME_PRESETS[0];
}
