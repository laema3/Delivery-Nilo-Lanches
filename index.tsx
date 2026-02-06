
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const handleServiceWorker = () => {
  const isSandbox = 
    window.location.hostname.includes('usercontent.goog') || 
    window.location.hostname.includes('ai.studio') ||
    window.location.hostname.includes('cloudshell') ||
    window.location.protocol === 'file:';

  if (isSandbox) {
    console.log('Nilo Lanches: Ambiente de Sandbox detectado. Desativando Service Worker para evitar erros de origem.');
    
    // Tenta limpar registros existentes que podem estar causando erros
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      }).catch(err => console.debug('Erro ao limpar SW:', err));
    }
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Nilo Lanches: PWA Ativo.');
          window.addEventListener('focus', () => reg.update());
        })
        .catch(err => console.debug('PWA Registration skipped in this context.', err));
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
