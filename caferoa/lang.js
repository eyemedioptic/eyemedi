/* CAFEROA – chuyển đổi ngôn ngữ (Google Translate) */
(function () {
  var LANGS = [
    ['vi', '🇻🇳', 'Tiếng Việt'],
    ['en', '🇬🇧', 'English'],
    ['zh-CN', '🇨🇳', '中文'],
    ['fr', '🇫🇷', 'Français'],
    ['it', '🇮🇹', 'Italiano'],
    ['ja', '🇯🇵', '日本語'],
    ['ko', '🇰🇷', '한국어'],
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

  window.CAFEROA_LANG = current();
  /* Dịch câu khách gõ sang tiếng Việt cho chatbot hiểu */
  window.caferoaToVi = function (text) {
    if (window.CAFEROA_LANG === 'vi' || !text) return Promise.resolve(text);
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=' + encodeURIComponent(text);
    return fetch(url).then(function (r) { return r.json(); })
      .then(function (j) { return (j[0] || []).map(function (x) { return x[0]; }).join('') || text; })
      .catch(function () { return text; });
  };
  var PH = { en:'Type your question… (e.g. which coffee is strong?)', 'zh-CN':'请输入您的问题…（例如：哪种咖啡浓？）', fr:'Posez votre question… (ex : quel café est corsé ?)', it:'Scrivi la tua domanda… (es. quale caffè è forte?)', ja:'質問を入力…（例：濃いコーヒーは？）', ko:'질문을 입력하세요… (예: 진한 커피는?)', hi:'अपना प्रश्न लिखें… (जैसे: कौन सी कॉफ़ी स्ट्रॉन्ग है?)', th:'พิมพ์คำถาม… (เช่น กาแฟตัวไหนเข้ม?)', ar:'اكتب سؤالك… (مثال: أي قهوة قوية؟)', lo:'ພິມຄຳຖາມ… (ເຊັ່ນ: ກາເຟໃດເຂັ້ມ?)', km:'វាយសំណួររបស់អ្នក… (ឧ. កាហ្វេណាខ្លាំង?)' };
  document.addEventListener('DOMContentLoaded', function () {
    var inp = document.getElementById('chatInput');
    if (inp && PH[window.CAFEROA_LANG]) inp.placeholder = PH[window.CAFEROA_LANG];
  });

  /* Tự dịch các phần do JavaScript tạo ra (chatbot, giỏ hàng, popup…) */
  if (window.CAFEROA_LANG !== 'vi') {
    var TL = window.CAFEROA_LANG, CK = 'caferoa_tr2_' + TL, cache = {};
    try { cache = JSON.parse(sessionStorage.getItem(CK) || '{}'); } catch (e) {}
    /* Gom nhiều đoạn vào 1 yêu cầu, tối đa 2 yêu cầu chạy cùng lúc */
    var queue = [], waiters = {}, active = 0, timer = null, alone = {};
    function save() { try { sessionStorage.setItem(CK, JSON.stringify(cache)); } catch (e) {} }
    function api(q) {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=' + TL + '&dt=t&q=' + encodeURIComponent(q);
      return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { return (j[0] || []).map(function (x) { return x[0]; }).join(''); });
    }
    function done(text, out) { cache[text] = out; (waiters[text] || []).forEach(function (f) { f(out); }); delete waiters[text]; }
    function fail(text) { (waiters[text] || []).forEach(function (f) { f(text); }); delete waiters[text]; }
    function pump() {
      while (active < 2 && queue.length) {
        var batch = [], len = 0;
        while (queue.length && !alone[queue[0]] && batch.length < 40 && len + queue[0].length < 1500) { var t = queue.shift(); batch.push(t); len += t.length + 1; }
        if (!batch.length) batch.push(queue.shift());
        active++;
        (function (batch) {
          var go = batch.length === 1 ? api(batch[0]).then(function (o) { return [o]; })
            : api(batch.join('\n')).then(function (o) { var p = o.split('\n'); if (p.length !== batch.length) throw new Error('split'); return p; });
          go.then(function (outs) { batch.forEach(function (t, i) { done(t, (outs[i] || t).trim() || t); }); save(); })
            .catch(function (e) {
              if (batch.length > 1 && String(e.message) === 'split') { batch.forEach(function (t) { alone[t] = 1; queue.unshift(t); }); }
              else batch.forEach(fail);
            })
            .then(function () { active--; setTimeout(pump, 120); });
        })(batch);
      }
    }
    function tr(text) {
      if (cache[text] !== undefined) return Promise.resolve(cache[text]);
      return new Promise(function (res) {
        if (waiters[text]) { waiters[text].push(res); return; }
        waiters[text] = [res];
        if (text.indexOf('\n') > -1) { alone[text] = 1; queue.unshift(text); } else queue.push(text);
        clearTimeout(timer); timer = setTimeout(pump, 30);
      });
    }
    var HAS_VI = /[A-Za-zÀ-ỹ]/;
    function walk(root) {
      if (!root || root.nodeType === 8) return;
      if (root.nodeType === 3) {
        var t = root.nodeValue, k = t.trim();
        if (!k || !HAS_VI.test(k) || root.__tr === k) return;
        var lead = t.match(/^\s*/)[0], tail = t.match(/\s*$/)[0];
        tr(k).then(function (v) { if (root.nodeValue === t) { root.nodeValue = lead + v + tail; root.__tr = v; } });
        return;
      }
      if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|SVG)$/i.test(root.tagName) || (root.classList && root.classList.contains('lang-sw'))) return;
      if (root.placeholder && !root.__ph) { root.__ph = 1; var ph = root.placeholder; if (HAS_VI.test(ph) && root.id !== 'chatInput') tr(ph).then(function (v) { root.placeholder = v; }); }
      for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
    }
    var ZONES = ['#chat', '#chatHello', '#toast', '#cart', '#modal', '#productGrid', '#moreWrap', '#newsList', '#filters', '#ticker', '#chartTip', '#mbar'];
    document.addEventListener('DOMContentLoaded', function () {
      ZONES.forEach(function (sel) {
        var z = document.querySelector(sel); if (!z) return;
        z.classList.add('notranslate'); z.setAttribute('translate', 'no');
        walk(z);
        new MutationObserver(function (ms) {
          ms.forEach(function (m) { m.addedNodes.forEach(walk); });
        }).observe(z, { childList: true, subtree: true });
      });
    });
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

/* CAFEROA – nút trở lại đầu trang */
(function () {
  var css = '.to-top{position:fixed;left:18px;bottom:22px;z-index:66;width:48px;height:48px;border-radius:50%;border:1px solid rgba(216,173,95,.5);background:#1f140e;color:#d8ad5f;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.28);opacity:0;visibility:hidden;transform:translateY(14px);transition:opacity .25s,transform .25s,visibility .25s,background .2s}' +
    '.to-top.show{opacity:1;visibility:visible;transform:none}' +
    '.to-top:hover{background:#c8964f;color:#fff}' +
    '.to-top svg{width:22px;height:22px}' +
    'body.has-mbar .to-top{bottom:80px}' +
    '@media (max-width:640px){.to-top{width:44px;height:44px;left:14px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function init() {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'to-top'; b.setAttribute('aria-label', 'Trở lại đầu trang'); b.title = 'Lên đầu trang';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    var tick = false;
    function upd() { b.classList.toggle('show', window.scrollY > Math.max(500, window.innerHeight * 0.8)); tick = false; }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
