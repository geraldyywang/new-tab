// ESLint rules for the Google TypeScript Style Guide; see docs/STYLE.md.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import {defineConfig, globalIgnores} from 'eslint/config';

// Syntax the guide disallows outright.
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
      'no-restricted-syntax': ['error', ...BANNED_SYNTAX],
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
    },
  },
]);
