const CACHE = 'vantage-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});

// Lets the page ask the service worker to fire a notification
// (works even if the page is backgrounded, not if fully closed/killed).
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SHOW_NUDGE') {
    self.registration.showNotification(e.data.title || "Today's leadership session", {
      body: e.data.body || "You haven't done today's 30-minute session yet.",
      icon: 'icon.svg',
      badge: 'icon.svg',
      tag: 'daily-nudge'
    });
  }
});
