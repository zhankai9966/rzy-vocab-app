import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { APP_VERSION, APP_VERSION_KEY } from './lib/appVersion';

async function clearOldAppShell() {
  const current = localStorage.getItem(APP_VERSION_KEY);
  if (current === APP_VERSION) return;

  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
  window.location.reload();
}

clearOldAppShell().catch(() => {
  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
