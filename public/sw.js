// Quán Bún PWA — cache-first cho tài nguyên build (tên file có hash), network-first cho trang; mở offline được sau lần tải đầu.
const VERSION = 'qb-' + (self.registration ? self.registration.scope : '') + '-v8';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (isPage) { try { const r = await fetch(req); cache.put('./index.html', r.clone()); return r; } catch { return (await cache.match('./index.html')) || Response.error(); } }
    const hit = await cache.match(req); if (hit) return hit;
    try { const r = await fetch(req); if (r.ok) cache.put(req, r.clone()); return r; } catch (err) { return hit || Response.error(); }
  })());
});
