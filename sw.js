// sw.js — Service Worker for offline PWA support.
// Cache-first strategy for static assets, network-first for level data.

const CACHE_NAME = 'rule-horror-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json',
];

// Install: pre-cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for dynamic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept http/https requests — skip chrome-extension, data, blob etc.
  if (!url.protocol.startsWith('http')) return;

  // Network-first for JS/CSS modules (hot-reload in dev)
  if (url.pathname.includes('/src/') || url.pathname.includes('/@')) {
    return; // let browser handle
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
