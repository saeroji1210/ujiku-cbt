// Service worker: simpan cangkang aplikasi agar terbuka cepat & tetap tampil saat sinyal lemah.
// Data (RPC Supabase) TIDAK pernah di-cache di sini.
const CACHE = 'ujiku-v9';
const SHELL = ['./', './index.html', './assets/css/app.css?v=3', './assets/js/app.js', './assets/js/core/api.js', './assets/js/core/ui.js', './assets/js/core/store.js', './assets/js/core/icons.js', './assets/js/core/art.js', './assets/img/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/rest/') || u.pathname.includes('/auth/')) return;
  // config.js selalu diambil dari jaringan dulu agar perubahan konfigurasi langsung berlaku
  if (u.pathname.endsWith('/config.js')) {
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // stale-while-revalidate untuk aset statis
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
