# new_tab(), a new tab extension for browsers!

[![CI](https://github.com/geraldyywang/new-tab/actions/workflows/ci.yml/badge.svg)](https://github.com/geraldyywang/new-tab/actions/workflows/ci.yml)

A Chrome Manifest V3 extension that replaces the new tab page with a clock,
local weather and editable quick links. Built with React 19, TypeScript, Vite
and Tailwind CSS 4.

![image](https://github.com/geraldyywang/new-tab/assets/96800313/56c18642-5d48-4c5a-8821-791bc9285866)

## Features

- **Clock**: the local date and time, updated every second.
- **Weather** for your current location, from [WeatherAPI](https://www.weatherapi.com/)
  with your own free key: place, condition and icon, temperature (°C), wind,
  precipitation, humidity and US EPA air quality.
  - Without a key it shows a prompt to open settings and a sign-up link.
  - Clear messages for a rejected key (with an **Open settings** button), a
    used-up monthly quota, a disabled key, denied or unavailable location, and
    network errors.
- **Links**: a sidebar on the right and a social bar at the bottom left.
  - Well-known sites (Gmail, Calendar, Drive, YouTube, Notion, Outlook,
    Claude, ChatGPT, Gemini, GitHub, LinkedIn, Instagram, X, Reddit) get a
    bundled icon; other sites use Chrome's favicon cache, or their first letter.
- **Settings panel** (gear icon next to the title):
  - WeatherAPI key: show/hide, **Test**, **Save**, **Clear**.
  - Sidebar and social links: add, edit, reorder, remove, **Reset to
    defaults**, then **Save**. URLs are validated (http/https only), and
    `example.com` becomes `https://example.com`.
  - Asks before discarding unsaved changes, and offers **Reload** when a
    setting changes on another device while you edit it.
- **Chrome sync**: settings follow your Google account (see
  [Settings and sync](#settings-and-sync)).

## Install

1. Install [Node.js](https://nodejs.org/) 22.22.2 or newer.
2. Run `npm ci`, then `npm run build`. This creates `dist/`. No `.env` file or
   API key is needed at build time.
3. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click
   **Load unpacked** and select the `dist` folder.
4. Open a new tab, click the gear icon, paste a free key from
   [WeatherAPI](https://www.weatherapi.com/signup.aspx), click **Test**, then
   **Save**.

After a rebuild, click the reload icon on the extension's card in
`chrome://extensions`.

## Settings and sync

| Setting        | Stored as       |
| -------------- | --------------- |
| WeatherAPI key | `weatherApiKey` |
| Sidebar links  | `sidebarLinks`  |
| Social links   | `socialLinks`   |

- In the extension, settings live in `chrome.storage.sync`, one item per
  setting (each must fit Chrome's 8 KB per-item limit). Unset lists use the
  defaults.
- On the dev server (`npm run dev`) they live in `localStorage` instead, under
  keys prefixed with `new-tab:`.
- Settings sync between computers only when Chrome is signed in, sync is on
  with **Extensions** included, and the extension has the same ID on each.
  Otherwise they stay on this device.

### Stable extension ID

`public/manifest.json` contains a fixed `key`. It gives the unpacked extension
the same ID (`pkhmhapiepbkchmgilgjekogiklkbppc`) on every computer, which is
what lets Chrome sync its settings. Remove the `key` field before uploading to
the Chrome Web Store, which assigns its own.

## Development

Run `npm ci` once, then `npm run dev` to start the Vite dev server at
http://localhost:5173. There settings use `localStorage`, the browser asks for
location permission, and unknown sites show a letter instead of a favicon.

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                       |
| `npm run build`     | Type-check and build the extension into `dist/` |
| `npm run preview`   | Serve the production build locally              |
| `npm run typecheck` | Run the TypeScript compiler (`tsc -b`)          |
| `npm run lint`      | Lint with ESLint, zero warnings allowed         |
| `npm test`          | Run the unit tests with Vitest                  |
| `npm run format`    | Format everything with Prettier                 |

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes to
`master` and on every pull request, on Node 22.x and the current LTS:
`npm ci`, `npx prettier --check .`, typecheck, lint, test and build. The LTS
job uploads `dist/` as the `new-tab-dist` artifact (kept for 14 days).

## Project structure

```text
src/
  main.tsx        Entry point
  index.css       Global styles; imports the theme tokens
  app/            The page layout (App.tsx)
  features/
    clock/        Clock
    weather/      Weather card, WeatherAPI client, API key settings section
    links/        Sidebar, social bar, link icons, links editor
  settings/       Settings dialog, storage (chrome.storage.sync / localStorage)
  ui/             Shared primitives: Card, Button, IconButton, TextInput
  theme/          Semantic colour tokens and the guard test
  test/           Vitest setup and mocks
public/           manifest.json, icons and weather condition images
```

New features go in `src/features/<name>/`.

## Contributing

- **Style**: the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html),
  enforced by ESLint and Prettier (gts settings). See
  [docs/STYLE.md](docs/STYLE.md) for the summary and the rules tooling can't
  check.
- **Colours**: semantic theme tokens from `src/theme/tokens.css` only (such as
  `bg-surface`, `text-fg-muted`), never palette colours or hex values.
  `src/theme/tokens.test.ts` fails if one slips in.
- **Workflow**: one issue, one branch, one pull request whose description says
  `Closes #N`.
- **Commits**: at most 200 lines of real code each (tests, the lockfile, docs
  and generated reformats don't count), and every commit passes all the checks
  above.

## Roadmap

Planned work is tracked in the
[milestones](https://github.com/geraldyywang/new-tab/milestones) and
[issues](https://github.com/geraldyywang/new-tab/issues).
