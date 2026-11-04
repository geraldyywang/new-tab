import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import {App} from './app/App';
import {applyCachedTheme} from './features/appearance/applyTheme';

// Before the first render, so the page never flashes the default theme
applyCachedTheme();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
