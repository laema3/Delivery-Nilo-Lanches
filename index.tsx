
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const handleServiceWorker = () => {
  const isSandbox = 
    window.location.hostname.includes('usercontent.goog') || 
    window.location.hostname.includes('ai.studio') ||
    window.location.hostname.includes('cloudshell') ||
    window.location.hostname.includes('github.dev') ||
    window.location.hostname === 'localhost' ||
    window.location.protocol === 'file:';

  if (isSandbox) {
    // Em ambientes de desenvolvimento/sandbox, limpamos qualquer SW antigo para evitar conflitos
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {});
    }
    return;
  }

  // Só tentamos registrar se estiver em produção real HTTPS
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.debug('PWA Online');
        })
        .catch(() => {});
    });
  }
};

handleServiceWorker();

const removeLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
  }
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  setTimeout(removeLoader, 800);
}
