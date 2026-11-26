/* Eyemedi Bán hàng: lưu sẵn giao diện để mở nhanh và mở được khi mạng chập chờn.
   Luôn lấy bản mới từ mạng trước; dữ liệu (máy chủ Apps Script) không lưu ở đây. */
const CACHE = 'eyemedi-app-v1';
const SHELL = ['/app/', '/app/manifest.webmanifest', '/app/icon-192.png', '/app/apple-touch-icon.png', '/ctv/config.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!(url.pathname.startsWith('/app/') || url.pathname === '/ctv/config.js')) return;
  const key = req.mode === 'navigate' ? '/app/' : url.pathname;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key).then(r => r || caches.match('/app/'))));
});
