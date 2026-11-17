import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles.css';
import App from './App';

// Posters are drawn to canvas, so the web fonts must be ready first.
const fonts = Promise.all([
  document.fonts.load('64px Anton'),
  document.fonts.load('500 32px "Barlow Condensed"'),
  document.fonts.load('600 32px "Barlow Condensed"'),
  document.fonts.load('700 32px "Barlow Condensed"'),
]).catch(() => {});
const timeout = new Promise((r) => setTimeout(r, 2500));

Promise.race([fonts, timeout]).then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
