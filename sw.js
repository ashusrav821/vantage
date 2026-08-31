const CACHE = 'vantage-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // activate this new SW immediately instead of waiting for old tabs to close
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()) // take control of already-open tabs right away
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const isHtmlRequest = req.mode === 'navigate' ||
    (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));

  if (isHtmlRequest) {
    // Network-first for the app shell itself: always try to get the latest
    // deployed index.html when online, so a redeploy shows up on next load
    // instead of being masked by a stale cached copy. Falls back to cache
    // (offline support) only if the network request fails.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Stale-while-revalidate for everything else (manifest, icon): serve the
  // cached copy instantly if we have one, but always refresh it in the
  // background so the *next* load picks up any change.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
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
