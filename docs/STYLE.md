# Code style

This project follows the
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).
Most of it is enforced by tooling, so reviews only need to check the
[rules that can't be linted](#not-linted-check-in-review).

Run `npm run format` to format and `npm run lint` to lint. Lint fails on any
warning (`--max-warnings 0`).

## Formatting (Prettier)

`.prettierrc` matches Google's [`gts`](https://github.com/google/gts) settings:

| Option           | Value   | Effect                                                         |
| ---------------- | ------- | -------------------------------------------------------------- |
| `singleQuote`    | `true`  | `'text'`, not `"text"` (JSX keeps `"`)                         |
| `trailingComma`  | `all`   | Trailing commas wherever they are valid                        |
| `bracketSpacing` | `false` | `{a, b}`, not `{ a, b }`                                       |
| `arrowParens`    | `avoid` | `x => x * 2`, not `(x) => x * 2`                               |
| `semi`           | `true`  | Semicolons always                                              |
| `printWidth`     | `80`    | Wrap at 80 columns                                             |
| `endOfLine`      | `lf`    | LF line endings (`.gitattributes` keeps working-tree files LF) |

## Lint rules (ESLint)

Configured in `eslint.config.js`, on top of `@eslint/js` recommended,
`typescript-eslint` recommended and the React hooks/refresh presets.

- **Named exports only.** No `export default` / `export {x as default}`.
  Exception: config files whose tools need one (`eslint.config.js`,
  `vite.config.ts`, `vitest.config.ts`).
- **`function` declarations for named functions**, including React components
  and nested helpers (`func-style`). Arrow functions are for callbacks and
  inline values (`items.map(x => ...)`, `onClick={() => ...}`, object
  properties).
- **`interface` for object types** (`consistent-type-definitions`). `type` is
  for unions, intersections, mapped and other non-object types.
- **No `any`** (use `unknown` and narrow it), **no non-null assertions** (`x!`),
  **no `@ts-ignore`/`@ts-nocheck`** (`@ts-expect-error` only with a
  description), **no `namespace`**, **no `const enum`**, **no `var`**,
  `prefer-const`.
- **`===` and `!==`** (`eqeqeq`). `== null` is allowed, as the guide permits,
  to match both `null` and `undefined`.
- **Throw only `Error` objects** (`@typescript-eslint/only-throw-error`, which
  uses type information).
- **No mutable exports**: exported variables must be `const`.
- **Array types** (`array-type: array-simple`): `T[]` / `readonly T[]` for
  simple element types, `Array<T>` / `ReadonlyArray<T>` for complex ones
  (`Array<() => void>`, `ReadonlyArray<[string, number]>`).
- **Naming** (`@typescript-eslint/naming-convention`):
  - `UpperCamelCase` for types, interfaces, classes, enums and type
    parameters; `CONSTANT_CASE` for enum members.
  - `lowerCamelCase` for variables, parameters, functions and methods.
  - `UpperCamelCase` is also allowed for functions and variables, for React
    components and component-valued bindings (`const Icon = iconFor(url)`).
  - `CONSTANT_CASE` is allowed for module-level `const`s.
  - No leading or trailing underscores. A lone `_` is allowed for an unused
    parameter.
  - Object literal and type property names are **not checked**: they often
    mirror external data or APIs (WeatherAPI's `temp_c` and `us-epa-index`,
    `aria-hidden`, `chrome.storage` constants like `QUOTA_BYTES_PER_ITEM`).
    Name your own properties `lowerCamelCase` anyway.

## Colours and UI primitives

- **Theme tokens only.** Colour utilities use the semantic tokens in
  `src/theme/tokens.css` (`bg-surface`, `text-fg-muted`, `border-danger/70`),
  never palette colours (`bg-neutral-900`), hex values or colour functions.
  `src/theme/tokens.test.ts` fails the build if one slips in. Themes override
  the `--color-*` properties under `[data-theme]` on `<html>`.
- **Primitives from `src/components/ui/`:** `Card` for every panel, bar and
  dialog surface (`surfaceAttributes()` for elements `Card` can't render,
  such as `<dialog>`), `Button`, `IconButton` and `TextInput` for controls.

## Not linted (check in review)

- **JSDoc on exported symbols.** Give every export a short `/** ... */` that
  says what it is for, not what its type already says. Skip it only when the
  name says it all.
- **Comments:** `/** JSDoc */` for documentation, `//` for implementation
  comments. No `/* block */` implementation comments.
- **Type assertions** (`x as T`) only with a comment explaining why they are
  safe. Prefer a type guard or narrowing. Never `as any`.
- **Prefer `unknown` over `any`**, and validate untrusted data (storage,
  network) before use.
- **Optional over `| undefined`** for optional fields and parameters
  (`a?: T`), and no `null`/`undefined` aliases in type names.
- **No `#private` fields**; use TypeScript's `private`. Mark properties that
  are never reassigned `readonly`.
- **Imports:** relative paths within `src/`; `import type` for type-only
  imports (enforced by `verbatimModuleSyntax`).
- **Descriptive names**; no abbreviations a new reader wouldn't know.
