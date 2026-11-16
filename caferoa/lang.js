/* CAFEROA – chuyển đổi ngôn ngữ (Google Translate) */
(function () {
  var LANGS = [
    ['vi', '🇻🇳', 'Tiếng Việt'],
    ['en', '🇬🇧', 'English'],
    ['fr', '🇫🇷', 'Français'],
    ['it', '🇮🇹', 'Italiano'],
    ['ja', '🇯🇵', '日本語'],
    ['ko', '🇰🇷', '한국어'],
    ['zh-CN', '🇨🇳', '中文'],
    ['hi', '🇮🇳', 'हिन्दी'],
    ['th', '🇹🇭', 'ไทย'],
    ['ar', '🇸🇦', 'العربية'],
    ['lo', '🇱🇦', 'ລາວ'],
    ['km', '🇰🇭', 'ខ្មែរ']
  ];
  var CODES = LANGS.map(function (l) { return l[0]; });

  function current() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/vi\/([^;]+)/);
    return m && CODES.indexOf(m[1]) > -1 ? m[1] : 'vi';
  }
  function setCookie(v) {
    var host = location.hostname, exp = v ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    var val = v ? '/vi/' + v : '';
    document.cookie = 'googtrans=' + val + '; path=/' + exp;
    if (host.indexOf('.') > -1) {
      document.cookie = 'googtrans=' + val + '; path=/; domain=.' + host.replace(/^www\./, '') + exp;
    }
  }
  function choose(code) {
    setCookie(code === 'vi' ? '' : code);
    location.reload();
  }

  /* CSS */
  var css = '' +
    '.lang-sw{position:relative;margin-right:2px}' +
    '.lang-btn{display:flex;align-items:center;gap:6px;height:38px;padding:0 10px;border-radius:999px;border:1px solid rgba(216,173,95,.35);color:#f2e7d6;font-size:.8rem;font-weight:600;background:transparent;cursor:pointer;white-space:nowrap}' +
    '.lang-btn:hover{border-color:#d8ad5f;color:#d8ad5f}' +
    '.lang-btn .fl{font-size:1.05rem;line-height:1}' +
    '.lang-btn svg{width:16px;height:16px}' +
    '.lang-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:200px;max-height:70vh;overflow:auto;background:#1f140e;border:1px solid rgba(216,173,95,.3);border-radius:14px;padding:6px;box-shadow:0 18px 36px rgba(0,0,0,.4);display:none;z-index:200}' +
    '.lang-sw.open .lang-menu{display:block}' +
    '.lang-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:.55rem .7rem;border-radius:9px;color:#efe4d2;font-size:.9rem;text-align:left;background:none;border:0;cursor:pointer}' +
    '.lang-menu button:hover{background:rgba(216,173,95,.14)}' +
    '.lang-menu button.on{background:rgba(216,173,95,.22);color:#d8ad5f;font-weight:600}' +
    '.lang-menu .fl{font-size:1.15rem;width:22px;text-align:center}' +
    '.lang-sw.floating{position:fixed;left:16px;bottom:22px;z-index:65}' +
    '.lang-sw.floating .lang-btn{background:#1f140e;box-shadow:0 8px 20px rgba(0,0,0,.25)}' +
    '.lang-sw.floating .lang-menu{top:auto;bottom:calc(100% + 8px);left:0;right:auto}' +
    '@media (max-width:640px){.lang-btn .nm{display:none}.lang-btn{padding:0 9px}}' +
    /* ẩn thanh Google Translate */
    'body{top:0!important;position:static!important}' +
    '.goog-te-banner-frame,.skiptranslate>iframe,#goog-gt-tt,.goog-te-balloon-frame,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none!important}' +
    '.goog-text-highlight{background:none!important;box-shadow:none!important}' +
    '#google_translate_element{display:none}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* Nút chọn ngôn ngữ */
  var cur = current(), info = LANGS.filter(function (l) { return l[0] === cur; })[0];
  var box = document.createElement('div');
  box.className = 'lang-sw notranslate'; box.setAttribute('translate', 'no');
  box.innerHTML = '<button type="button" class="lang-btn" aria-label="Chọn ngôn ngữ / Language" aria-haspopup="true">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>' +
    '<span class="fl">' + info[1] + '</span><span class="nm">' + info[0].toUpperCase().replace('ZH-CN', 'ZH') + '</span></button>' +
    '<div class="lang-menu" role="menu">' + LANGS.map(function (l) {
      return '<button type="button" role="menuitem" data-l="' + l[0] + '" class="' + (l[0] === cur ? 'on' : '') + '"><span class="fl">' + l[1] + '</span>' + l[2] + '</button>';
    }).join('') + '</div>';

  var host = document.querySelector('.header-actions');
  if (host) host.insertBefore(box, host.firstChild);
  else {
    var hd = document.querySelector('header.site .wrap') || document.querySelector('header .container');
    if (hd) { hd.appendChild(box); } else { box.classList.add('floating'); document.body.appendChild(box); }
  }
  box.querySelector('.lang-btn').addEventListener('click', function (e) { e.stopPropagation(); box.classList.toggle('open'); });
  box.querySelectorAll('.lang-menu button').forEach(function (b) {
    b.addEventListener('click', function () { if (b.dataset.l !== cur) choose(b.dataset.l); else box.classList.remove('open'); });
  });
  document.addEventListener('click', function () { box.classList.remove('open'); });

  /* Chỉ tải Google Translate khi đã chọn ngôn ngữ khác tiếng Việt */
  if (cur !== 'vi') {
    var div = document.createElement('div'); div.id = 'google_translate_element'; document.body.appendChild(div);
    window.caferoaGT = function () {
      new google.translate.TranslateElement({ pageLanguage: 'vi', includedLanguages: CODES.join(','), autoDisplay: false }, 'google_translate_element');
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=caferoaGT';
    document.body.appendChild(s);
  }
})();
