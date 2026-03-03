/**
 * VoidTV Service Worker
 * Cache-first strategy for static assets, network-first for data
 * Version: 1.0.0
 */

const CACHE_NAME = 'voidtv-v1.0.0';
const DATA_CACHE = 'voidtv-data-v1.0.0';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/VoidTV/',
  '/VoidTV/index.html',
  '/VoidTV/manifest.json',
  '/VoidTV/icons/icon.svg',
  '/VoidTV/movies.json',
];

// Install — precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — route-based strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept cross-origin video embeds or AdSense
  if (
    url.origin !== location.origin ||
    url.pathname.includes('/embed/') ||
    url.hostname.includes('googlesyndication') ||
    url.hostname.includes('doubleclick')
  ) {
    return;
  }

  // movies.json — network-first, cache fallback
  if (url.pathname.endsWith('movies.json')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets — cache-first
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (res && res.status === 200 && event.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
    )
  );
});

// Background sync for offline watch progress
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
