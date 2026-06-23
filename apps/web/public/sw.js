// Minimal service worker for installability + an offline fallback.
// Navigations are network-first (so a fresh deploy/reload is never masked by a
// stale cached shell); static assets are cache-first; /api/* is network-only.
const CACHE = 'phronos-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') return; // network-only

  // Network-first for page navigations; fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  // Cache-first for other static GETs.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
