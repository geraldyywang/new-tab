import {describe, expect, it} from 'vitest';
import tailwindThemeCss from 'tailwindcss/theme.css?raw';
import tokensCss from '../../theme/tokens.css?raw';
import {contrastRatio, parseColor, type Rgb} from '../../theme/color';
import {
  presetById,
  THEME_PRESETS,
  TOKEN_NAMES,
  type PresetId,
  type TokenName,
} from './presets';

/** WCAG AA: 4.5:1 for body text, 3:1 for large text and UI components. */
const BODY_TEXT = 4.5;
const LARGE_TEXT_OR_UI = 3;

/**
 * Foreground/background token pairs the UI actually draws, with the WCAG AA
 * threshold each needs. Not checked: `fg-faint` (placeholders and hover dims,
 * which WCAG exempts), `border` (hairlines; inputs also stand out by their
 * inset background) and `surface-3` (hover backgrounds under `fg` text,
 * covered by the `surface-2` pairs in every preset by construction).
 */
const PAIRS: ReadonlyArray<{
  fg: TokenName;
  bg: TokenName;
  min: number;
  usage: string;
}> = [
  {fg: 'fg', bg: 'surface', min: BODY_TEXT, usage: 'dialog text'},
  {fg: 'fg', bg: 'surface-inset', min: BODY_TEXT, usage: 'input text'},
  {fg: 'fg', bg: 'surface-2', min: BODY_TEXT, usage: 'hovered buttons'},
  {fg: 'fg-muted', bg: 'surface', min: BODY_TEXT, usage: 'section titles'},
  {fg: 'fg-muted', bg: 'surface-2', min: BODY_TEXT, usage: 'button labels'},
  {fg: 'fg-subtle', bg: 'surface', min: BODY_TEXT, usage: 'hints, weather'},
  {fg: 'fg-subtle', bg: 'backdrop', min: BODY_TEXT, usage: 'footer credit'},
  {
    fg: 'fg-subtle',
    bg: 'surface-2',
    min: LARGE_TEXT_OR_UI,
    usage: 'icons and letter badges on raised controls',
  },
  {fg: 'accent', bg: 'surface', min: LARGE_TEXT_OR_UI, usage: 'focus rings'},
  {
    fg: 'accent',
    bg: 'backdrop',
    min: LARGE_TEXT_OR_UI,
    usage: 'focus ring of the settings button',
  },
  {fg: 'danger', bg: 'surface', min: BODY_TEXT, usage: 'error messages'},
  {fg: 'success', bg: 'surface', min: BODY_TEXT, usage: 'success messages'},
  {fg: 'warning-fg', bg: 'surface', min: BODY_TEXT, usage: 'conflict notice'},
];

/**
 * Stone is the original look and stays unchanged, so its faint grey hint text
 * is only AA for large text (the clock): 3.79:1 on cards, 3.21:1 on the page.
 */
const KNOWN_EXCEPTIONS: Partial<Record<PresetId, readonly string[]>> = {
  stone: ['fg-subtle/surface', 'fg-subtle/backdrop'],
};

function rgb(preset: PresetId, token: TokenName): Rgb {
  const parsed = parseColor(presetById(preset).tokens[token]);
  if (!parsed) throw new Error(`${preset} ${token} is not a parseable colour`);
  return parsed;
}

const CASES = THEME_PRESETS.flatMap(preset =>
  PAIRS.map(pair => ({preset: preset.id, ...pair})),
);

describe('theme presets', () => {
  it.each(CASES)(
    '$preset: $fg on $bg ($usage) meets $min:1',
    ({preset, fg, bg, min}) => {
      const ratio = contrastRatio(rgb(preset, fg), rgb(preset, bg));
      const excepted = KNOWN_EXCEPTIONS[preset]?.includes(`${fg}/${bg}`);
      expect(ratio).toBeGreaterThanOrEqual(excepted ? LARGE_TEXT_OR_UI : min);
    },
  );

  it('defines every token of every preset as a colour', () => {
    for (const preset of THEME_PRESETS) {
      for (const token of TOKEN_NAMES) {
        expect(parseColor(preset.tokens[token])).not.toBeNull();
      }
    }
  });

  it('has unique ids', () => {
    expect(new Set(THEME_PRESETS.map(p => p.id)).size).toBe(
      THEME_PRESETS.length,
    );
  });

  it('keeps Stone in step with tokens.css and the Tailwind palette', () => {
    const palette = new Map(
      [...tailwindThemeCss.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map(
        match => [match[1], match[2].trim()],
      ),
    );
    for (const token of TOKEN_NAMES) {
      const definition = new RegExp(
        `--color-${token}:\\s*var\\((--color-[\\w-]+)\\);`,
      ).exec(tokensCss);
      expect(definition, token).not.toBeNull();
      expect(presetById('stone').tokens[token], token).toBe(
        palette.get(definition?.[1] ?? ''),
      );
    }
  });
});
