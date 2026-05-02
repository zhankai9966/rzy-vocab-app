import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { APP_VERSION, APP_VERSION_KEY, APP_VERSION_RELOAD_KEY } from './lib/appVersion';

async function clearOldAppShell() {
  const current = localStorage.getItem(APP_VERSION_KEY);
  if (current === APP_VERSION) return;

  if (sessionStorage.getItem(APP_VERSION_RELOAD_KEY) === APP_VERSION) {
    sessionStorage.removeItem(APP_VERSION_RELOAD_KEY);
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    return;
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }

  sessionStorage.setItem(APP_VERSION_RELOAD_KEY, APP_VERSION);
  const url = new URL(window.location.href);
  url.searchParams.set('appVersion', APP_VERSION);
  window.location.replace(url);
}

clearOldAppShell().catch(() => {
  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
