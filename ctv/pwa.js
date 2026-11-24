/* EYEMEDI CTV – đăng ký service worker + hướng dẫn cài ứng dụng lên màn hình chính. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/ctv/sw.js', { scope: '/ctv/' }).catch(function () {}); });
  }
  var ua = navigator.userAgent || '';
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;
  var KEY = 'eyemedi_pwa_hide';
  try { if (Number(localStorage.getItem(KEY) || 0) > Date.now()) return; } catch (e) {}
  var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var inApp = /FBAN|FBAV|FB_IAB|Instagram|Zalo|Line\/|TikTok|musical_ly|BytedanceWebview/i.test(ua);
  var iosOther = ios && /CriOS|FxiOS|EdgiOS/i.test(ua);
  var deferred = null;
  var SHARE = '<svg width="14" height="16" viewBox="0 0 14 18" fill="none" stroke="#0b5558" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M7 1v11M3.5 4.5 7 1l3.5 3.5M4.5 7H2v10h10V7H9.5"/></svg>';

  var css = '.pwa-card{background:#fff;border:1px solid var(--line,#d7e8ed);border-radius:14px;padding:12px 14px;margin-bottom:16px;display:flex;gap:12px;align-items:center}' +
    '.pwa-card img{width:46px;height:46px;border-radius:11px;flex:none;box-shadow:0 1px 4px rgba(0,0,0,.12)}' +
    '.pwa-card .t{flex:1;min-width:0}.pwa-card b{display:block;font-size:15px;line-height:1.3}.pwa-card small{color:#5b7378;font-size:13px}' +
    '.pwa-card .go{border:0;background:#0b5558;color:#fff;font:inherit;font-weight:700;padding:10px 14px;border-radius:10px;white-space:nowrap;cursor:pointer}' +
    '.pwa-card .x{border:0;background:none;font-size:20px;color:#8a9a9e;cursor:pointer;padding:0 0 0 2px;line-height:1}' +
    '.pwa-ov{position:fixed;inset:0;background:rgba(7,58,60,.45);z-index:99;display:flex;align-items:flex-end;justify-content:center}' +
    '.pwa-sh{background:#fff;border-radius:18px 18px 0 0;padding:20px 18px 26px;width:100%;max-width:520px;position:relative;margin-bottom:0}' +
    '.pwa-sh h3{margin:0 0 10px;font-size:17px}.pwa-sh ol{margin:0;padding-left:20px;font-size:15px;line-height:1.9}' +
    '.pwa-sh .k{display:inline-block;border:1px solid #d7e8ed;border-radius:6px;padding:0 6px;background:#eaf8fc;font-weight:600;line-height:1.5}' +
    '.pwa-sh .ok{margin-top:14px;width:100%;border:0;background:#0b5558;color:#fff;font:inherit;font-weight:700;padding:12px;border-radius:10px}' +
    '.pwa-arrow{position:fixed;left:50%;bottom:6px;transform:translateX(-50%);font-size:34px;color:#fff;z-index:100;pointer-events:none;animation:pwab 1s infinite;text-shadow:0 1px 4px rgba(0,0,0,.4)}' +
    '@keyframes pwab{50%{transform:translate(-50%,8px)}}';
  function steps() {
    if (inApp) return '<h3>Mở bằng trình duyệt để tải app</h3><ol><li>Bấm <span class="k">•••</span> hoặc <span class="k">⋮</span> ở góc trên.</li><li>Chọn <span class="k">Mở bằng trình duyệt</span> (' + (ios ? 'Safari' : 'Chrome') + ').</li><li>Bấm lại nút <span class="k">Tải app ngay</span>.</li></ol>';
    if (ios) return '<h3>Tải app EYEMEDI CTV về iPhone</h3><ol><li>Bấm nút <span class="k">Chia sẻ ' + SHARE + '</span> ' + (iosOther ? 'trên thanh địa chỉ' : 'ở thanh dưới cùng Safari (hoặc <span class="k">•••</span> → Chia sẻ)') + '.</li><li>Chọn <span class="k">Thêm vào MH chính</span>.</li><li>Bấm <span class="k">Thêm</span> là xong.</li></ol>';
    if (android) return '<h3>Tải app EYEMEDI CTV về điện thoại</h3><ol><li>Bấm <span class="k">⋮</span> ở góc trên bên phải Chrome.</li><li>Chọn <span class="k">Cài đặt ứng dụng</span> hoặc <span class="k">Thêm vào màn hình chính</span>.</li><li>Bấm <span class="k">Cài đặt</span> là xong.</li></ol>';
    return '<h3>Tải app EYEMEDI CTV</h3><ol><li>Trên máy tính: bấm biểu tượng cài đặt <span class="k">⊕</span> ở cuối thanh địa chỉ Chrome/Edge.</li><li>Trên điện thoại: mở trang này và chọn <span class="k">Thêm vào màn hình chính</span>.</li></ol>';
  }
  function guide() {
    var ov = document.createElement('div'); ov.className = 'pwa-ov';
    var arrow = ios && !iosOther && !inApp;
    ov.innerHTML = '<div class="pwa-sh"' + (arrow ? ' style="margin-bottom:58px;border-radius:18px;width:calc(100% - 20px)"' : '') + '>' + steps() + '<button class="ok" type="button">Đã hiểu</button></div>' +
      (arrow ? '<div class="pwa-arrow">⬇</div>' : '');
    function close() { ov.remove(); }
    ov.onclick = function (e) { if (e.target === ov) close(); };
    ov.querySelector('.ok').onclick = close;
    document.body.appendChild(ov);
  }
  function install() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; var c = document.getElementById('pwaCard'); if (c) c.remove(); });
    } else guide();
  }
  function render() {
    var main = document.querySelector('main');
    if (!main || document.getElementById('pwaCard')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div'); d.className = 'pwa-card'; d.id = 'pwaCard';
    d.innerHTML = '<img src="/ctv/icons/icon-192.png" alt="EYEMEDI CTV"><div class="t"><b>App EYEMEDI CTV</b><small>Xem đơn hàng, hoa hồng ngay trên điện thoại</small></div>' +
      '<button class="go" type="button">Tải app ngay</button><button class="x" aria-label="Đóng" title="Đóng">×</button>';
    main.insertBefore(d, main.firstChild);
    d.querySelector('.go').onclick = install;
    d.querySelector('.x').onclick = function () {
      d.remove(); try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); } catch (e) {}
    };
  }
  function showButton() {}
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showButton(); });
  window.addEventListener('appinstalled', function () { var c = document.getElementById('pwaCard'); if (c) c.remove(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
