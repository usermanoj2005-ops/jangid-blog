import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

if (typeof window !== 'undefined') {
  // Prevent read-only window.fetch assignment errors in sandbox/iframe environments
  try {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return originalFetch;
      },
      set(val) {
        console.warn("Muted attempt to overwrite window.fetch:", val);
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn("Failed to patch window.fetch property descriptor:", e);
  }

  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && localStorage.getItem(key) === 'undefined') {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && sessionStorage.getItem(key) === 'undefined') {
            sessionKeysToRemove.push(key);
        }
    }
    sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch(e) {}
}

import App from './App.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
