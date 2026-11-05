import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import {App} from './app/App';
import {applyCachedTheme} from './features/appearance/applyTheme';
import {BACKGROUND_IMAGE} from './features/background/backgroundImage';

// Before the first render, so the page never flashes the default theme
applyCachedTheme();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

// Start reading the photo now so it is ready by the first paint
BACKGROUND_IMAGE.load();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
