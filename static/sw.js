// Service worker — required for PWA installability.
// Uses a network-first strategy: always try the network, fall back to cache.

const CACHE_NAME = 'kitchen-v1';

// Pre-cache the CSS, fonts, and HTMX on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/',
        '/static/style.css',
        'https://unpkg.com/htmx.org@2.0.4',
      ])
    )
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: try network, fall back to cache
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests (except CDN assets we cached)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for offline fallback
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
