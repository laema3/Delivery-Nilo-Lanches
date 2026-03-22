
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Tratamento de Service Worker com detecção de atualização
const handleServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
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
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
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
