# new_tab(), a new tab extension for browsers!

![image](https://github.com/geraldyywang/new-tab/assets/96800313/56c18642-5d48-4c5a-8821-791bc9285866)

Built with React 19, TypeScript, Vite and Tailwind CSS 4, packaged as a Chrome Manifest V3 extension.

## How to Use

1. Install [Node.js](https://nodejs.org/) 22.12 or newer, then run `npm install`.
2. Run `npm run build` to create a production build in `dist/`. No `.env` file or API key is needed at build time.
3. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the `dist` folder.
4. Open a new tab and click the gear icon next to the `new_tab()` title.
5. Paste a free API key from [WeatherAPI](https://www.weatherapi.com/signup.aspx), click **Test** to check it, then **Save**.
6. In the same panel, edit, reorder, add or remove the sidebar and social links, then click **Save** under each list.
7. After you rebuild, click the reload icon on the extension card.

### Settings sync

Settings (the WeatherAPI key and your links) are stored with `chrome.storage.sync`. They follow your Google account to other computers when you are signed in to Chrome with sync turned on and **Extensions** included in what you sync. Otherwise they stay on this device only. When you run `npm run dev`, settings are kept in the browser's `localStorage` instead.

### Stable extension ID

`public/manifest.json` contains a fixed `key`. It gives the unpacked extension the same ID (`pkhmhapiepbkchmgilgjekogiklkbppc`) on every computer, which is what lets Chrome sync its settings between them. Remove the `key` field before uploading the extension to the Chrome Web Store, because the store assigns its own key.

## Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server at http://localhost:5173 |
| `npm run build`     | Type-check and build the extension into `dist/`    |
| `npm run preview`   | Serve the production build locally                 |
| `npm run typecheck` | Run the TypeScript compiler                        |
| `npm run lint`      | Lint with ESLint                                   |
| `npm test`          | Run the unit tests with Vitest                     |
| `npm run format`    | Format with Prettier                               |
