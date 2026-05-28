// Increment this version number every time you deploy a new version
// The service worker will detect the change and clear old caches automatically
const VERSION = '1.3';
const CACHE = `medx-stocktake-${VERSION}`;
const ASSETS = ['./index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Delete ALL old caches that don't match current version
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Always go to network for Firebase
  if(e.request.url.includes('firebaseio.com')){
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{}', {headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }
  // Network first for HTML — ensures updates show up
  if(e.request.destination === 'document'){
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache first for everything else
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
    )
  );
});
