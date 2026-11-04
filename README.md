# new_tab(), a new tab extension for browsers!

![image](https://github.com/geraldyywang/new-tab/assets/96800313/56c18642-5d48-4c5a-8821-791bc9285866)

[Live demo](https://geraldtab.netlify.app/)

[![Netlify Status](https://api.netlify.com/api/v1/badges/9b348492-d6d6-418f-9e2b-819e0072681b/deploy-status)](https://app.netlify.com/sites/geraldtab/deploys)

Built with React 19, TypeScript, Vite and Tailwind CSS 4, packaged as a Chrome Manifest V3 extension.

## How to Use

1. Install [Node.js](https://nodejs.org/) 22.12 or newer, then run `npm install`.
2. Edit the link lists in `src/components/HelpfulLinks.tsx` and `src/components/Socials.tsx`.
3. Sign up and generate an API key from [WeatherAPI](https://www.weatherapi.com/).
4. Create a `.env` file in the project root containing:
   ```
   VITE_WEATHERAPI_API_KEY=your-api-key-here
   ```
   The key is bundled into the built extension, so only use it for personal builds.
5. Run `npm run build` to create a production build in `dist/`.
6. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the `dist` folder.
7. Open a new tab. After you rebuild, click the reload icon on the extension card.

## Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server at http://localhost:5173 |
| `npm run build`     | Type-check and build the extension into `dist/`    |
| `npm run preview`   | Serve the production build locally                 |
| `npm run typecheck` | Run the TypeScript compiler                        |
| `npm run lint`      | Lint with ESLint                                   |
| `npm run format`    | Format with Prettier                               |
