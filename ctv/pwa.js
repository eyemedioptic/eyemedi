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

  var css = '.pwa-card{background:#fff;border:1px solid var(--line,#d7e8ed);border-radius:14px;padding:14px 16px;margin-bottom:16px;display:flex;gap:12px;align-items:flex-start;position:relative}' +
    '.pwa-card img{width:52px;height:52px;border-radius:12px;flex:none;box-shadow:0 1px 4px rgba(0,0,0,.12)}' +
    '.pwa-card b{display:block;font-size:15px;margin-bottom:2px}.pwa-card ol{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.55}' +
    '.pwa-card .x{position:absolute;top:6px;right:8px;border:0;background:none;font-size:20px;color:#5b7378;cursor:pointer;line-height:1}' +
    '.pwa-card .k{display:inline-block;border:1px solid #d7e8ed;border-radius:6px;padding:0 6px;background:#eaf8fc;font-weight:600}' +
    '.pwa-card .btn{margin-top:8px}';
  function steps() {
    if (inApp) return '<ol><li>Bấm <span class="k">•••</span> hoặc <span class="k">⋮</span> ở góc trên.</li><li>Chọn <b style="display:inline">Mở bằng trình duyệt</b> (' + (ios ? 'Safari' : 'Chrome') + ').</li><li>Làm theo hướng dẫn cài hiện ra ở trình duyệt.</li></ol>';
    if (ios) return '<ol><li>Bấm nút <span class="k">Chia sẻ ' + SHARE + '</span> ' + (iosOther ? 'trên thanh địa chỉ' : 'ở thanh dưới cùng của Safari') + '.</li><li>Kéo xuống, chọn <span class="k">Thêm vào MH chính</span>.</li><li>Bấm <span class="k">Thêm</span>. Biểu tượng EYEMEDI CTV sẽ có trên màn hình.</li></ol>';
    if (android) return '<ol><li>Bấm <span class="k">⋮</span> ở góc trên bên phải Chrome.</li><li>Chọn <span class="k">Thêm vào màn hình chính</span> hoặc <span class="k">Cài đặt ứng dụng</span>.</li><li>Bấm <span class="k">Cài đặt</span>.</li></ol>';
    return '<ol><li>Trên máy tính (Chrome/Edge): bấm biểu tượng cài đặt <span class="k">⊕</span> ở cuối thanh địa chỉ.</li><li>Trên điện thoại: mở trang này rồi chọn <span class="k">Thêm vào màn hình chính</span>.</li></ol>';
  }
  function render() {
    var main = document.querySelector('main');
    if (!main || document.getElementById('pwaCard')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div'); d.className = 'pwa-card'; d.id = 'pwaCard';
    d.innerHTML = '<img src="/ctv/icons/icon-192.png" alt="EYEMEDI CTV"><div><b>Cài ứng dụng EYEMEDI CTV lên điện thoại</b>' +
      '<span style="font-size:14px;color:#5b7378">Mở nhanh để xem đơn hàng, hoa hồng, không cần gõ lại địa chỉ.</span>' +
      '<div id="pwaBody">' + steps() + '</div></div><button class="x" aria-label="Đóng" title="Đóng">×</button>';
    main.insertBefore(d, main.firstChild);
    d.querySelector('.x').onclick = function () {
      d.remove(); try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); } catch (e) {}
    };
    if (deferred) showButton();
  }
  function showButton() {
    var body = document.getElementById('pwaBody'); if (!body || !deferred) return;
    body.innerHTML = '<button class="btn" type="button" id="pwaInstall">Cài ứng dụng</button>';
    document.getElementById('pwaInstall').onclick = function () {
      deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; var c = document.getElementById('pwaCard'); if (c) c.remove(); });
    };
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showButton(); });
  window.addEventListener('appinstalled', function () { var c = document.getElementById('pwaCard'); if (c) c.remove(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
