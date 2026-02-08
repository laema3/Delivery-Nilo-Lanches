import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // <--- ESTA LINHA É CRUCIAL PARA O VISUAL (TAILWIND)

// Tratamento de Service Worker
const handleServiceWorker = () => {
  const isSandbox = 
    window.location.hostname.includes('usercontent.goog') || 
    window.location.hostname.includes('ai.studio') ||
    window.location.hostname === 'localhost';

  if (isSandbox) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) registration.unregister();
      }).catch(() => {});
    }
    return;
  }

  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    setTimeout(removeLoader, 800);
  } catch (e) {
    console.error("CRITICAL RENDER ERROR:", e);
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #333; font-family: sans-serif;">
        <h1>Ops! Algo deu errado.</h1>
        <p>Não foi possível carregar o aplicativo.</p>
        <p style="color: red; font-size: 12px;">${e}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #008000; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px;">Recarregar Página</button>
      </div>
    `;
    removeLoader();
  }
}