import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import {App} from './app/App';
import {applyCachedTheme} from './features/appearance/applyTheme';
import {BACKGROUND_IMAGE} from './features/background/backgroundImage';
import {installRefraction} from './ui/refraction';
import {watchSheen} from './ui/sheen';

// Before the first render, so the page never flashes the default theme
applyCachedTheme();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

// Start reading the photo now so it is ready by the first paint
BACKGROUND_IMAGE.load();

// Liquid glass's sheen follows the pointer, and its edges bend the light
watchSheen();
installRefraction();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
