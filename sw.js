
const CACHE_NAME = 'nilo-lanches-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // CRÍTICO: Não cachear chamadas do Firebase/Firestore ou do Google Gemini
  // Isso garante que os dados em tempo real sempre venham da rede, não do cache local
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('generativelanguage.googleapis.com')) {
    return; // Deixa o navegador/SDK lidar com a rede diretamente
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
