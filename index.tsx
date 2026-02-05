import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Registro inteligente do Service Worker
const registerSW = () => {
  if ('serviceWorker' in navigator) {
    // Registra apenas se não for localhost ou se estiver explicitamente em produção
    const isLocal = window.location.hostname === 'localhost';
    const isSandbox = window.location.hostname.includes('usercontent.goog');
    
    // Evita erro de cross-origin em sandboxes do AI Studio, mas permite em produção
    if (!isSandbox || isLocal) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Nilo Lanches: PWA Ativo!', reg.scope))
          .catch(err => console.debug('SW: Registro ignorado por restrição de domínio.'));
      });
    }
  }
};

registerSW();

const removeLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 500);
  }
};

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    setTimeout(removeLoader, 800);
  } catch (error) {
    console.error("Critical Render Error:", error);
    removeLoader();
  }
}