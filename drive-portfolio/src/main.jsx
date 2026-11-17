import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/archivo-black/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles.css';
import App from './App';

// Posters are drawn to canvas, so the web fonts must be ready first.
const fonts = Promise.all([
  document.fonts.load('64px "Archivo Black"'),
  document.fonts.load('400 32px "IBM Plex Mono"'),
  document.fonts.load('600 32px "IBM Plex Mono"'),
]).catch(() => {});
const timeout = new Promise((r) => setTimeout(r, 2500));

Promise.race([fonts, timeout]).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
