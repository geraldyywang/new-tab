# Settings storage

Settings are split into **slices**. Each feature owns its slices and defines
them next to its code with `defineSettingsSlice` (`src/settings/slices.ts`).
A slice is one storage key in one area:

- **`sync`**: `chrome.storage.sync`. Follows the user's Google account to their
  other computers when Chrome sync includes extensions. Small and rate-limited
  (see the budget below).
- **`local`**: `chrome.storage.local`. This computer only, about 10 MB. Use it
  for anything big or device-specific.

On the Vite dev server (`npm run dev`) both areas fall back to `localStorage`,
with the prefixes `new-tab:` (sync) and `new-tab-local:` (local).

**No migrations while prototyping.** Stored values carry no version. A value
that fails its slice's `parse` (corrupt, or from an older build) is ignored and
the default is used until the user saves again. Settings saved by 2.1
(`weatherApiKey`, `sidebarLinks`, `socialLinks`) are not read by 2.2.

## Sync budget

Chrome's limits for `chrome.storage.sync`:

| Limit                                    | Value         |
| ---------------------------------------- | ------------- |
| `QUOTA_BYTES` (all items)                | 102,400 bytes |
| `QUOTA_BYTES_PER_ITEM` (key + JSON)      | 8,192 bytes   |
| `MAX_ITEMS`                              | 512           |
| `MAX_WRITE_OPERATIONS_PER_MINUTE` / hour | 120 / 1,800   |

Every key in use:

| Key              | Area | Owner              | Holds                   | Expected size                              |
| ---------------- | ---- | ------------------ | ----------------------- | ------------------------------------------ |
| `weather.apiKey` | sync | `features/weather` | WeatherAPI key (string) | ~50 B                                      |
| `links.sidebar`  | sync | `features/links`   | Sidebar link list       | ~1 KB for 8 links; capped at 8 KB          |
| `links.social`   | sync | `features/links`   | Social link list        | ~0.6 KB for 5 links; capped at 8 KB        |
| **Total**        |      |                    |                         | ~2 KB typical, ~16 KB worst case of 100 KB |

Saving a sync slice that isn't chunked checks the 8 KB item limit first and
fails with a `SettingsWriteError` ("too much data for one setting") without
writing. Add new sync slices to this table, with an estimate.

## Chunking

A slice defined with `chunked: true` can grow past 8 KB. Its JSON text is split
into string chunks, each a separate item no bigger than 8 KB:

```
themes     {"chunks": 3}      <- manifest
themes:0   "[{\"id\":\"nord\",…"
themes:1   "…"
themes:2   "…}]"
```

A save writes all chunks in one `set`, then the manifest, then removes chunks
left over from a longer previous value. A read gets the manifest, then its
chunks. If a chunk is missing or the joined text isn't valid JSON (e.g. a save
from another device landed half-way), the value reads as missing and the
default is used; the next change event re-reads it. Keys may not contain `:`,
which is reserved for chunk keys. A chunked value may use at most 256 chunks,
but remember the 100 KB total.

## Adding a slice

1. Define it in your feature folder, e.g. `src/features/clock/settings.ts`:

   ```ts
   export const clockSlice = defineSettingsSlice<ClockSettings>({
     key: 'clock',
     area: 'sync',
     parse: parseClockSettings, // unknown -> ClockSettings | null
     default: DEFAULT_CLOCK_SETTINGS,
   });
   ```

   `parse` must validate everything: storage is untrusted, and another
   computer may run a different build (and imported files go through it too).

   Optional fields: `label` names the slice in the import summary (defaults
   to the key); `secret: true` marks values such as API keys, which settings
   export leaves out unless the user ticks a checkbox.

   `defineSettingsSlice` adds the slice to a registry
   (`listSettingsSlices()` in `src/settings/sliceRegistry.ts`). Export and
   import cover every registered `sync` slice automatically; `local` slices
   stay on the device and are never exported.

2. Read it with `useSlice(clockSlice)`, which returns `{loaded, value}` and
   re-renders when the value changes in this tab, another tab or on another
   device. Write it with `saveSlice(clockSlice, value)` and remove it (back to
   the default) with `resetSlice(clockSlice)`. Both reject with a
   `SettingsWriteError` whose message can be shown to the user.

3. To edit it in the settings dialog, add a section component that takes
   `SettingsSectionProps` (`title`, `onDirtyChange`), a `SettingsSection`
   entry next to it (`{id, title, order, slices, Component}`), and one line in
   `src/settings/sections.ts`.

4. Add the key to the budget table above.
