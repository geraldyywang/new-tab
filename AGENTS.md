# Working on new_tab()

These are the rules for anyone changing this repo: people, Claude Code and
other coding agents. [docs/STYLE.md](docs/STYLE.md) covers code style and
[docs/storage.md](docs/storage.md) covers settings storage. This file covers
everything else: how work is split, sized, checked and shipped, and the roles
agents play.

## Project

- **What it is:** a Chrome Manifest V3 extension that replaces the new tab
  page. It has a fixed extension ID (`key` in `public/manifest.json`) so
  `chrome.storage.sync` works across computers.
- **Stack:** Vite, React 19, TypeScript (strict), Tailwind CSS 4, ESLint
  (type-aware, zero warnings), Prettier (gts settings), Vitest + React Testing
  Library + jsdom. Node 22.22.2 or newer.
- **Prototype:** there are no users yet, so there is **no backwards
  compatibility**. Don't write migrations or legacy readers. Stored formats may
  change freely, and old saved data may simply fall back to defaults.

## Layout

```text
src/
  main.tsx          Entry point (applies cached theme before first render)
  app/              Page layout
  features/<name>/  One folder per feature: components, logic, settings
                    slice, settings section, tests
  settings/         Settings dialog, section registry, slices, storage
  ui/               Shared primitives (Card, Button, ...) and surfaces
  theme/            Semantic colour tokens, shared colour maths, guard test
  test/             Vitest setup and mocks
```

- **Feature code** lives in `src/features/<name>/`. Only infrastructure goes in
  `settings/`, `ui/` and `theme/`.
- **Shared files** (`sections.ts`, `App.tsx`, `main.tsx`) get one-line
  registrations, so parallel branches merge cleanly.
- **Dependencies between features** go one way only. If two features need the
  same code, move it to `src/theme/`, `src/ui/` or `src/settings/`.

## Rules for every change

### Issues, branches and pull requests

- One issue, one branch, one pull request into `master`. The PR description
  says `Closes #N`.
- **Never stack PRs.** Branch from the latest `origin/master`. When `master`
  moves, merge it into your branch; don't rebase a pushed branch.
- **Never force-push and never amend pushed commits.** Add a new commit.
- **Don't merge your own PR.** The maintainer merges after review.
- PR descriptions include:
  - a summary and the design decisions
  - a per-commit table of real-code line counts
  - the test count
  - screenshots, for UI changes
  - a manual Chrome checklist
  - `Closes #N`
- Bodies are long, so pass them with `gh pr create --body-file`.

### Commit size

- **At most 200 lines of real code per commit:** lines added plus removed, per
  `git diff --numstat`.
- **Not counted:**
  - `*.test.ts(x)` and `src/test/**`
  - `package-lock.json`
  - `*.md`
  - binary assets
  - pure Prettier reformats
- Plan the commit sequence before starting.
- **Every commit passes every check on its own:**

  ```sh
  npx prettier --check .
  npm run typecheck
  npm run lint
  npm test
  npm run build
  ```

### Code

- **Style:** follow [docs/STYLE.md](docs/STYLE.md) (Google TypeScript Style
  Guide): named exports, `function` declarations, interfaces for object
  shapes, and JSDoc on every export.
- **Colours:** use semantic tokens from `src/theme/tokens.css` only. No
  palette classes and no hex values in UI code; `src/theme/tokens.test.ts`
  enforces this.
- **UI:** build from the primitives in `src/ui/`. Surfaces come from
  `Card` / `surfaceAttributes` with a `Surface` value; never style a card by
  hand.
- **Settings:** settings are slices. Use `defineSettingsSlice` and
  `useSlice` / `saveSlice` / `resetSlice`, and register a section in
  `src/settings/sections.ts`. Add every sync key to the table in
  `docs/storage.md`, with a size estimate.
- **Untrusted data:** anything read from storage, IndexedDB, files or the
  network is untrusted. Validate it with a `parse` function and fall back to a
  default; never cast.
- **Accessibility:** aim for WCAG AA. Text keeps at least 4.5:1 contrast
  (3:1 for large text and non-text UI) against whatever it actually sits on,
  including translucent panes over a photo. Respect
  `prefers-reduced-motion`. Controls are reachable and labelled for keyboard
  and screen readers.
- **Permissions:** don't add manifest permissions without saying why in the
  PR.

### Tests

- Every piece of logic gets Vitest tests, next to the code
  (`foo.ts` → `foo.test.ts`).
- Components get React Testing Library tests of behaviour, not snapshots.
- Tests must not print errors or warnings. Mock what jsdom lacks, e.g.
  `fake-indexeddb/auto` for IndexedDB.
- **Test through the UI the way a user would**, in a real browser, as well
  as with preloaded state. Click the controls, change settings while the
  page or dialog is already open and scrolled, press **Save**, then reload
  and check the result stuck. Screenshots of seeded state alone don't prove
  a feature works: liquid glass (#39) passed every seeded screenshot but
  blanked the settings dialog when picked from the dialog itself.

### Screenshots for UI changes

The maintainer reviews visual changes from the PR page, so UI PRs embed real
screenshots.

- `gh` can't upload images. Push PNGs to an orphan branch
  `screenshots/issue-<N>`, in a folder `issue-<N>/`. Never put them on
  `master` or the feature branch, and only add files there.
- **Embed** them with
  `https://raw.githubusercontent.com/geraldyywang/new-tab/screenshots/issue-<N>/issue-<N>/<file>.png`
  and check that each URL returns 200.
- **Take** them with Playwright and Chromium against `npm run preview`, from a
  folder outside the repo; never add Playwright to the repo.
- **Cover:** each new state, before/after for changed looks, light and dark
  themes, and with and without a background photo when surfaces are involved.
- **No copyrighted images:** generate test photos.
- **Unchanged looks:** when a change should leave a look unchanged, prove it
  with a pixel diff against `master`.

### Git and GitHub hygiene

- `.gitattributes` forces LF line endings.
- **Worktrees:**
  - Remove them only with `git worktree remove --force <path>`.
  - Run `npm ci` inside each worktree.
  - Never link `node_modules` from another checkout, and never recursively
    delete a folder that contains a link.
- **Permission rejections:** if a push or GitHub action is rejected for
  permissions or token scopes, stop and report it. Don't work around it by
  switching remotes, protocols or tokens.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs all checks on
  Node 22.x and the current LTS for every PR. Wait for it to pass:
  `gh run list --branch <b>`, then `gh run watch <id> --exit-status`.

### Windows notes (the maintainer's machine)

- **Shell:** PowerShell 5.1. There is no `&&` / `||`; use
  `A; if ($?) { B }`. Don't redirect `2>&1` on native programs.
- **gh** is at `C:\Program Files\GitHub CLI\gh.exe`.
- **File encoding:** `Set-Content` writes the ANSI code page and `Out-File`
  adds a BOM. Write files with the editor tools or as UTF-8 without a BOM.

## Agent roles

Larger work is split between roles. In Claude Code each role is a subagent
in [`.claude/agents/`](.claude/agents/); other tools can follow the same
descriptions. Each role follows every rule above.

| Role              | Does                                                                      | Changes code?          |
| ----------------- | ------------------------------------------------------------------------- | ---------------------- |
| **implementer**   | Builds one issue end to end: plan, commits, tests, screenshots, PR        | Yes, on its branch     |
| **reviewer**      | Reviews a PR for correctness, rules and design; gives a verdict           | No                     |
| **tester**        | Runs the checks, tests edge cases and the UI in a browser, writes tests   | Tests only             |
| **style-checker** | Checks a diff against docs/STYLE.md and the token, UI and settings rules  | No (reports)           |
| **simplifier**    | Finds duplication, dead code and over-engineering; proposes smaller code  | Yes, behaviour-neutral |
| **coordinator**   | The main session: splits work into issues, briefs agents, merges `master` | Merges and docs        |

### The usual flow

1. **Coordinator:** turns a request into an issue with a checklist, or
   updates an existing one, then briefs an implementer with the issue, the
   relevant files and anything the issue doesn't say.
2. **Implementer:** builds it, opens the PR and reports back: the PR URL,
   the commit table, the test count, CI, the decisions worth reviewing, the
   screenshot URLs and anything not done.
3. **Reviewer:** checks the PR, with the tester and style-checker as needed.
   It verifies the line counts and checks itself rather than trusting the
   report, and looks at the screenshots.
4. **Fixes:** the implementer adds commits for the reviewer's findings. The
   simplifier may add a cleanup commit.
5. **Maintainer:** tests a build in Chrome and merges. When PRs touch the
   same files, merge them one at a time; after each merge the coordinator
   merges `master` into the next one, resolves conflicts and reruns every
   check.

### Briefing an agent

A brief contains:

- the goal, and the maintainer's exact words when there are any
- the issue number and branch
- the base commit
- the files to read first
- the decisions already made, and the ones left to the agent
- the screenshots wanted
- what to report

Agents' reports are their own claims, so verify them.
