/* EYEMEDI CTV – service worker: cho phép cài lên màn hình chính, mở nhanh khi mạng yếu.
   Trang HTML luôn lấy bản mới nhất từ mạng (chỉ dùng bản lưu khi mất mạng). */
// Muốn bật thông báo đẩy OneSignal sau này: thêm dòng importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
var CACHE = 'eyemedi-ctv-v10';
var CORE = ['/ctv/', '/ctv/index.html', '/ctv/app.html', '/ctv/admin.html', '/ctv/ctv.css', '/ctv/api.js',
  '/ctv/pwa.js', '/ctv/push.js', '/ctv/config.js', '/ctv/icons/icon-192.png', '/images/logo-eyemedi.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // không đụng tới máy chủ Apps Script
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
});
