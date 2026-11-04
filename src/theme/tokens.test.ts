import {describe, expect, it} from 'vitest';
import tokensCss from './tokens.css?raw';

// Every source file except tests and the token definitions themselves
const SOURCES = import.meta.glob<string>(
  [
    '/src/**/*.{ts,tsx,css}',
    '!/src/**/*.test.{ts,tsx}',
    '!/src/test/**',
    '!/src/theme/tokens.css',
  ],
  {query: '?raw', import: 'default', eager: true},
);

const PALETTE = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'mauve',
  'olive',
  'mist',
  'taupe',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
].join('|');

const UTILITY_PREFIXES = [
  'bg',
  'text',
  'border(?:-[xytrblse])?',
  'ring',
  'ring-offset',
  'inset-ring',
  'outline',
  'divide',
  'placeholder',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'text-shadow',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'decoration',
  'caret',
  'accent',
].join('|');

const PALETTE_COLOR = `(?:(?:${PALETTE})-\\d{2,3}|black|white)`;

const HARD_CODED_COLOR_PATTERNS: readonly RegExp[] = [
  // Palette utilities: `bg-neutral-900`, `hover:text-red-400/90`, `to-white`
  new RegExp(`\\b(?:${UTILITY_PREFIXES})-${PALETTE_COLOR}(?![\\w-])`, 'g'),
  // Palette variables: `var(--color-neutral-700)`
  new RegExp(`--color-${PALETTE_COLOR}(?![\\w-])`, 'g'),
  // Hex colours in strings, arbitrary values and CSS (`&#128156;` is text)
  /(?<=[\s[:'"`(,])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})\b/gi,
  // Colour functions
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi,
];

/** Returns every hard-coded colour in `source`, in order of appearance. */
function findHardCodedColors(source: string): string[] {
  return HARD_CODED_COLOR_PATTERNS.flatMap(pattern =>
    [...source.matchAll(pattern)].map(match => match[0]),
  ).sort((a, b) => source.indexOf(a) - source.indexOf(b));
}

describe('findHardCodedColors', () => {
  it('finds palette utilities with variants and opacity', () => {
    expect(
      findHardCodedColors(
        'p-2 bg-neutral-900 hover:text-stone-50 border-red-400/70 to-white',
      ),
    ).toEqual([
      'bg-neutral-900',
      'text-stone-50',
      'border-red-400',
      'to-white',
    ]);
  });

  it('finds palette variables, hex colours and colour functions', () => {
    expect(
      findHardCodedColors(
        "[scrollbar-color:var(--color-zinc-700)_transparent] bg-[#1a1a1a] color: rgb(0 0 0); c = '#fff'",
      ),
    ).toEqual(['--color-zinc-700', '#1a1a1a', 'rgb(', '#fff']);
  });

  it('allows tokens, non-colour utilities and HTML entities', () => {
    expect(
      findHardCodedColors(
        'bg-surface text-fg-muted border-danger/70 text-2xl border-2 shadow-2xl outline-offset-2 var(--color-border) Made with &#128156;',
      ),
    ).toEqual([]);
  });
});

describe('theme tokens', () => {
  it('finds the source files to check', () => {
    expect(Object.keys(SOURCES)).toContain('/src/app/App.tsx');
    expect(Object.keys(SOURCES)).toContain('/src/index.css');
    // Vitest blanks CSS unless vitest.config.ts keeps `?raw` imports raw
    for (const source of Object.values(SOURCES)) {
      expect(source).not.toBe('');
    }
  });

  it.each(Object.entries(SOURCES))(
    '%s uses theme tokens, not hard-coded colours',
    (_, source) => {
      expect(findHardCodedColors(source)).toEqual([]);
    },
  );

  it('defines every semantic token', () => {
    const defined = [...tokensCss.matchAll(/^\s*--color-([\w-]+):/gm)].map(
      match => match[1],
    );
    expect(defined).toEqual(
      expect.arrayContaining([
        'backdrop',
        'surface',
        'surface-2',
        'surface-3',
        'fg',
        'fg-muted',
        'fg-subtle',
        'accent',
        'border',
        'danger',
        'success',
      ]),
    );
  });
});
