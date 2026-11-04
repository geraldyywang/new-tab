// ESLint rules for the Google TypeScript Style Guide; see docs/STYLE.md.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import {defineConfig, globalIgnores} from 'eslint/config';

// Syntax the guide disallows outright. Config files re-declare the rule
// without the default-export entries (see the override below).
const BANNED_SYNTAX = [
  {
    selector: 'TSEnumDeclaration[const=true]',
    message: 'Use a plain `enum` (or a union type), not `const enum`.',
  },
  {
    selector: 'ExportNamedDeclaration > VariableDeclaration[kind!="const"]',
    message: 'Mutable exports are not allowed; export a `const`.',
  },
];
const DEFAULT_EXPORT_SYNTAX = [
  {
    selector: 'ExportDefaultDeclaration',
    message: 'Use named exports, not `export default`.',
  },
  {
    selector: 'ExportSpecifier[exported.name="default"]',
    message: 'Use named exports, not `export {x as default}`.',
  },
];

export default defineConfig([
  globalIgnores(['dist', 'build', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        ...BANNED_SYNTAX,
        ...DEFAULT_EXPORT_SYNTAX,
      ],
      'func-style': ['error', 'declaration', {allowArrowFunctions: false}],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', {null: 'ignore'}],

      '@typescript-eslint/array-type': ['error', {default: 'array-simple'}],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        // `_` alone marks an intentionally unused binding
        {
          selector: ['variable', 'parameter'],
          filter: {regex: '^_$', match: true},
          format: null,
        },
        // PascalCase: React components and component-valued bindings
        {selector: 'function', format: ['camelCase', 'PascalCase']},
        {selector: 'variable', format: ['camelCase', 'PascalCase']},
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {selector: 'import', format: ['camelCase', 'PascalCase']},
        {selector: 'typeLike', format: ['PascalCase']},
        {selector: 'enumMember', format: ['UPPER_CASE']},
        // Property names often mirror external data (WeatherAPI's `temp_c`,
        // `aria-*` props, chrome.storage constants), so they are not checked
        {selector: ['objectLiteralProperty', 'typeProperty'], format: null},
      ],
    },
  },
  {
    // Temporary: files not yet converted to function declarations
    files: ['src/components/settings/*.tsx'],
    rules: {'func-style': 'off'},
  },
  {
    // Config files whose tools require a default export
    files: ['eslint.config.js', 'vite.config.ts', 'vitest.config.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...BANNED_SYNTAX],
    },
  },
]);
