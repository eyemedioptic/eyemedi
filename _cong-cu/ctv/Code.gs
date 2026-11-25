/**
 * EYEMEDI – Máy chủ Cộng tác viên (CTV / KOL / KOC) chạy trên Google Apps Script.
 *
 * CÀI ĐẶT (làm 1 lần):
 *  1. Tạo 1 Google Sheet mới, đặt tên "EYEMEDI - Cong tac vien".
 *  2. Tiện ích mở rộng → Apps Script → xóa hết code mẫu, dán toàn bộ file này vào, bấm Lưu.
 *  3. Chọn hàm "caiDat" ở thanh trên → Chạy → cấp quyền (Sheet + Drive).
 *  4. Triển khai → Tác vụ triển khai mới → Loại: Ứng dụng web
 *       Thực thi dưới dạng: Tôi   |   Người có quyền truy cập: Bất kỳ ai
 *     → Triển khai → chép "URL ứng dụng web" (…/exec) dán vào ctv/config.js.
 *  5. Đăng ký 1 tài khoản tại eyemedi.vn/ctv/ bằng SĐT của anh, rồi trong Sheet tab "CTV"
 *     ghi TRUE vào cột is_admin và "active" vào cột status của dòng đó → tài khoản quản trị.
 *  6. Chọn hàm "capQuyenGuiMail" → Chạy → cấp quyền gửi email (dùng cho "Quên mật khẩu").
 *  Khi sửa code: Triển khai → Quản lý triển khai → Sửa (bút chì) → Phiên bản mới → Triển khai.
 */

var SITE = 'https://eyemedi.vn';
var CONTRACT_VERSION = 'HD-CTV-2026.2';
var SAMPLE_DISCOUNT = 0.5;          // đơn mẫu = 50% giá web
// Hoa hồng theo DOANH THU THÁNG (tổng giá trị đơn ĐÃ GIAO trong tháng của CTV).
// Bậc đạt được áp dụng cho TẤT CẢ đơn trong tháng đó. Mỗi bậc kéo dài tới ngưỡng bậc sau.
// from = doanh thu tối thiểu, above = true nghĩa là phải VƯỢT mức from.
var TIERS = [
  { from: 0,         rate: 10, label: 'Dưới 5.000.000đ' },
  { from: 5000000,   rate: 15, label: '5.000.000đ – dưới 10.000.000đ' },
  { from: 10000000,  rate: 20, label: '10.000.000đ – 30.000.000đ' },
  { from: 30000000,  rate: 25, label: 'Trên 30.000.000đ – 50.000.000đ', above: true },
  { from: 50000000,  rate: 30, label: 'Trên 50.000.000đ – 100.000.000đ', above: true },
  { from: 100000000, rate: 35, label: 'Trên 100.000.000đ', above: true }
];
var SESSION_DAYS = 30;

var SHEETS = {
  CTV: ['id', 'created_at', 'full_name', 'phone', 'email', 'kind', 'channels', 'ref_code', 'status',
        'commission_rate', 'bank_name', 'bank_account', 'bank_holder', 'admin_note', 'is_admin',
        'pw_salt', 'pw_hash', 'username'],
  HopDong: ['ctv_id', 'ref_code', 'signed_at', 'version', 'full_name', 'id_number', 'id_issued',
            'address', 'pdf_url', 'user_agent', 'dob', 'phone', 'email'],
  DonMau: ['id', 'created_at', 'ctv_id', 'ref_code', 'product_id', 'product_name', 'variant',
           'web_price', 'sample_price', 'receiver', 'phone', 'address', 'note', 'status'],
  Video: ['id', 'created_at', 'ctv_id', 'ref_code', 'url', 'note', 'status', 'admin_note'],
  DonHang: ['order_code', 'created_at', 'ref_code', 'ctv_id', 'customer_name', 'customer_phone',
            'items', 'total', 'commission_rate', 'commission', 'status', 'paid', 'paid_at', 'page', 'eligible'],
  PhienDangNhap: ['token', 'ctv_id', 'expires'],
  DatLaiMK: ['token_hash', 'ctv_id', 'expires', 'used_at'],
  ThongBao: ['id', 'created_at', 'to', 'title', 'body', 'url']
};
// CTV có link bán hàng ngay sau khi đăng ký. Hoa hồng chỉ mở khi video review được duyệt (trạng thái active).
// Đơn bán TRƯỚC khi mở hoa hồng: false = không tính hoa hồng; true = được tính lại khi video được duyệt.
var RETRO_COMMISSION = true;
var RESET_MINUTES = 60;             // link đặt lại mật khẩu có hiệu lực 60 phút

// Trạng thái CTV theo quy trình
// pending → approved → signed → sample_ordered → sample_received → video_submitted → active
var STATUSES = ['pending', 'approved', 'signed', 'sample_ordered', 'sample_received',
                'video_submitted', 'active', 'rejected', 'locked'];

/* ====================== CÀI ĐẶT ====================== */
function caiDat() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = SHEETS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@'); // giữ nguyên số 0 đầu SĐT
  });
  var s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  folder_();
  Logger.log('Xong. Thư mục Drive lưu hợp đồng: ' + folder_().getUrl());
}

function folder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('EYEMEDI - Hop dong CTV');
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

/* ====================== CỔNG API ====================== */
function doGet(e) {
  return json_({ ok: true, service: 'eyemedi-ctv', version: CONTRACT_VERSION });
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (x) {}
  var action = String(req.action || '');
  var fn = API[action];
  if (!fn) return json_({ ok: false, error: 'Yêu cầu không hợp lệ' });
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var data = fn(req);
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

var API = {
  /* ---------- Bước 1: đăng ký tự tạo tài khoản ---------- */
  register: function (r) {
    var phone = normPhone_(r.phone);
    if (!phone) throw new Error('Số điện thoại không hợp lệ');
    if (String(r.password || '').length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự');
    var name = clean_(r.full_name, 80);
    if (name.length < 2) throw new Error('Vui lòng nhập họ tên');
    var t = table_('CTV');
    if (t.find('phone', phone)) throw new Error('Số điện thoại này đã đăng ký, vui lòng đăng nhập');
    var email = clean_(r.email, 120).toLowerCase();
    if (email && t.find('email', email)) throw new Error('Email này đã được dùng cho tài khoản khác');
    var code = String(r.ref_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (code.length < 4 || t.find('ref_code', code)) {
      do { code = 'EM' + Math.random().toString(36).slice(2, 7).toUpperCase(); } while (t.find('ref_code', code));
    }
    var salt = Utilities.getUuid();
    var kind = ['CTV', 'KOL', 'KOC'].indexOf(r.kind) >= 0 ? r.kind : 'CTV';
    var row = {
      id: Utilities.getUuid(), created_at: now_(), full_name: name, phone: phone,
      email: email, kind: kind, channels: clean_(r.channels, 500), ref_code: code,
      status: 'pending', commission_rate: '', is_admin: 'FALSE',
      pw_salt: salt, pw_hash: hash_(salt, r.password)
    };
    t.insert(row);
    notify_('admin', 'CTV mới đăng ký', name + ' – ' + phone + ' (' + kind + ')', '/ctv/admin.html');
    notify_(row.id, 'Chào mừng bạn đến với EYEMEDI', 'Hồ sơ đang chờ duyệt. Link bán hàng của bạn đã sẵn sàng, chia sẻ ngay nhé!', '/ctv/app.html');
    return { token: newSession_(row.id), me: publicMe_(row) };
  },

  login: function (r) {
    // chống dò mật khẩu: sai 8 lần trong 15 phút thì tạm khóa đăng nhập tài khoản đó 15 phút
    var cache = CacheService.getScriptCache(), key = loginKey_(r.phone);
    var fails = Number(cache.get(key) || 0);
    if (fails >= 8) throw new Error('Bạn nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc bấm "Quên mật khẩu"');
    var u = findLogin_(r.phone);
    if (!u || !pwOk_(u, r.password)) { cache.put(key, String(fails + 1), 900); throw new Error('Sai thông tin đăng nhập hoặc mật khẩu'); }
    cache.remove(key);
    if (u.status === 'locked') throw new Error('Tài khoản đã bị khóa, vui lòng liên hệ EYEMEDI');
    return { token: newSession_(u.id), me: publicMe_(u) };
  },

  logout: function (r) {
    var t = table_('PhienDangNhap');
    var s = t.find('token', String(r.token || ''));
    if (s) t.remove(s);
    CacheService.getScriptCache().remove('s_' + r.token);
    return true;
  },

  me: function (r) {
    var u = auth_(r);
    var out = { me: publicMe_(u) };
    out.contract = pick_(table_('HopDong').find('ctv_id', u.id), ['signed_at', 'version', 'pdf_url']);
    out.sample = table_('DonMau').find('ctv_id', u.id) || null;
    out.videos = table_('Video').filterBy('ctv_id', u.id);
    var orders = table_('DonHang').filterBy('ctv_id', u.id).map(function (o) {
      return {
        order_code: o.order_code, created_at: o.created_at, items: o.items, total: num_(o.total),
        commission_rate: num_(o.commission_rate), commission: num_(o.commission), status: o.status,
        paid: o.paid === 'TRUE', paid_at: o.paid_at, eligible: eligible_(o),
        customer_name: String(o.customer_name || '').slice(0, 1) + '***',
        customer_phone: '*******' + String(o.customer_phone || '').slice(-3)
      };
    }).reverse();
    out.orders = orders;
    out.month = monthSummary_(u);
    out.tiers = TIERS;
    out.retro = RETRO_COMMISSION;
    return out;
  },

  updateProfile: function (r) {
    var u = auth_(r);
    var t = table_('CTV');
    var em = clean_(r.email, 120).toLowerCase();
    emailTaken_(em, u.id);
    t.update(u, {
      email: em, channels: clean_(r.channels, 500),
      bank_name: clean_(r.bank_name, 80), bank_account: clean_(r.bank_account, 40),
      bank_holder: clean_(r.bank_holder, 80)
    });
    return true;
  },

  changePassword: function (r) {
    var u = auth_(r);
    if (hash_(u.pw_salt, r.old_password) !== u.pw_hash) throw new Error('Mật khẩu cũ không đúng');
    if (String(r.new_password || '').length < 6) throw new Error('Mật khẩu mới tối thiểu 6 ký tự');
    var salt = Utilities.getUuid();
    table_('CTV').update(u, { pw_salt: salt, pw_hash: hash_(salt, r.new_password) });
    notify_(u.id, 'Mật khẩu vừa được đổi', 'Nếu không phải bạn đổi, hãy liên hệ EYEMEDI ngay.', '/ctv/app.html');
    return true;
  },

  /* Quên mật khẩu: gửi link đặt lại tới email đã đăng ký. Luôn trả cùng 1 câu để không lộ tài khoản. */
  forgotPassword: function (r) {
    var DONE = 'Nếu tài khoản có email, link đặt lại mật khẩu đã được gửi tới email đó (hiệu lực ' + RESET_MINUTES +
      ' phút). Hãy kiểm tra cả thư mục Spam/Quảng cáo.';
    var u = findLogin_(r.phone);
    if (!u || u.status === 'locked') return { message: DONE };
    var email = String(u.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: DONE };
    var cache = CacheService.getScriptCache();
    if (cache.get('rs_' + u.id)) return { message: DONE };   // chống gửi liên tục: 2 phút / lần
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Hôm nay đã hết lượt gửi email, vui lòng nhắn Zalo EYEMEDI');
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var t = resetTable_();
    t.all().forEach(function (x) { if (x.ctv_id === u.id && !x.used_at) t.update(x, { used_at: 'thay thế ' + now_() }); });
    t.insert({ token_hash: sha_(token), ctv_id: u.id, expires: Date.now() + RESET_MINUTES * 6e4, used_at: '' });
    var link = SITE + '/ctv/dat-lai-mat-khau.html#t=' + token;
    var name = esc_(u.full_name || u.username || 'bạn');
    MailApp.sendEmail({
      to: email, name: 'EYEMEDI Cộng tác viên',
      subject: 'Đặt lại mật khẩu tài khoản cộng tác viên EYEMEDI',
      body: 'Chào ' + (u.full_name || 'bạn') + ',\n\nBấm link sau để đặt mật khẩu mới (hiệu lực ' + RESET_MINUTES + ' phút):\n' + link +
        '\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.\nEYEMEDI',
      htmlBody: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:520px">' +
        '<p>Chào <b>' + name + '</b>,</p><p>EYEMEDI nhận được yêu cầu đặt lại mật khẩu tài khoản cộng tác viên của bạn.</p>' +
        '<p style="margin:22px 0"><a href="' + link + '" style="background:#0b5558;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Đặt mật khẩu mới</a></p>' +
        '<p style="color:#666;font-size:13px">Link có hiệu lực ' + RESET_MINUTES + ' phút và chỉ dùng được 1 lần. Nếu bạn không yêu cầu, hãy bỏ qua email này, mật khẩu cũ vẫn giữ nguyên.</p>' +
        '<p>EYEMEDI</p></div>'
    });
    cache.put('rs_' + u.id, '1', 120);
    return { message: DONE };
  },

  resetPassword: function (r) {
    var bad = 'Link đặt lại mật khẩu không đúng hoặc đã hết hạn, vui lòng bấm "Quên mật khẩu" để nhận link mới';
    var token = String(r.reset_token || '');
    if (token.length < 40) throw new Error(bad);
    if (String(r.password || '').length < 6) throw new Error('Mật khẩu mới tối thiểu 6 ký tự');
    var t = resetTable_(), x = t.find('token_hash', sha_(token));
    if (!x || x.used_at || Number(x.expires) < Date.now()) throw new Error(bad);
    var ct = table_('CTV'), u = ct.find('id', x.ctv_id);
    if (!u) throw new Error(bad);
    if (u.status === 'locked') throw new Error('Tài khoản đã bị khóa, vui lòng liên hệ EYEMEDI');
    var salt = Utilities.getUuid();
    ct.update(u, { pw_salt: salt, pw_hash: hash_(salt, r.password) });
    t.update(x, { used_at: now_() });
    // đăng xuất mọi thiết bị cũ
    var ss = table_('PhienDangNhap'), cache = CacheService.getScriptCache();
    ss.all().slice().reverse().forEach(function (s) { if (s.ctv_id === u.id) { cache.remove('s_' + s.token); ss.remove(s); } });
    notify_(u.id, 'Mật khẩu vừa được đặt lại', 'Bạn đã đặt lại mật khẩu qua email. Các thiết bị cũ đã được đăng xuất.', '/ctv/app.html');
    return { token: newSession_(u.id), me: publicMe_(u) };
  },

  /* ---------- Bước 2: hợp đồng online ---------- */
  contractPreview: function (r) {
    var u = auth_(r);
    return { version: CONTRACT_VERSION, html: contractHtml_(u, {
      full_name: u.full_name, id_number: '……………', id_issued: '……………', address: '……………' }, null) };
  },

  signContract: function (r) {
    var u = auth_(r);
    if (u.status !== 'approved') throw new Error('Tài khoản chưa được duyệt hoặc đã ký hợp đồng');
    var info = {
      full_name: clean_(r.full_name, 80), id_number: clean_(r.id_number, 20),
      id_issued: clean_(r.id_issued, 120), address: clean_(r.address, 200),
      dob: clean_(r.dob, 10), phone: normPhone_(r.phone), email: clean_(r.email, 120)
    };
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(info.dob);
    if (!m) throw new Error('Vui lòng nhập ngày sinh');
    var age = (Date.now() - new Date(+m[1], +m[2] - 1, +m[3]).getTime()) / (365.25 * 864e5);
    if (!(age >= 18 && age < 100)) throw new Error('Người ký hợp đồng phải từ đủ 18 tuổi');
    info.dob = m[3] + '/' + m[2] + '/' + m[1];
    if (!info.phone) throw new Error('Số điện thoại không hợp lệ');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) throw new Error('Email không hợp lệ');
    if (!/^\d{9,12}$/.test(info.id_number)) throw new Error('Số CCCD không hợp lệ');
    if (!info.full_name || !info.address) throw new Error('Vui lòng điền đủ thông tin');
    var sig = String(r.signature || '');
    if (sig.indexOf('data:image/png;base64,') !== 0 || sig.length < 2000) throw new Error('Vui lòng ký tên');
    if (sig.length > 400000) throw new Error('Chữ ký quá lớn');
    var bank = { bank_name: clean_(r.bank_name, 80), bank_account: clean_(r.bank_account, 40), bank_holder: clean_(r.bank_holder, 80) };
    if (!bank.bank_name || !/^\d{6,20}$/.test(bank.bank_account.replace(/\s/g, '')) || !bank.bank_holder) throw new Error('Vui lòng nhập đủ tài khoản ngân hàng nhận hoa hồng');
    info.email = info.email.toLowerCase();
    emailTaken_(info.email, u.id);
    bank.email = info.email;
    table_('CTV').update(u, bank);
    var signedAt = now_();
    var html = contractHtml_(u, info, { sig: sig, at: signedAt });
    var pdf = Utilities.newBlob(html, 'text/html', 'hd.html').getAs('application/pdf')
      .setName('Hop dong CTV - ' + u.ref_code + ' - ' + u.full_name + '.pdf');
    var file = folder_().createFile(pdf);
    folder_().createFile(Utilities.newBlob(Utilities.base64Decode(sig.split(',')[1]), 'image/png',
      'Chu ky - ' + u.ref_code + '.png'));
    table_('HopDong').insert({
      ctv_id: u.id, ref_code: u.ref_code, signed_at: signedAt, version: CONTRACT_VERSION,
      full_name: info.full_name, id_number: info.id_number, id_issued: info.id_issued,
      address: info.address, pdf_url: file.getUrl(), user_agent: clean_(r.user_agent, 300),
      dob: info.dob, phone: info.phone, email: info.email
    });
    table_('CTV').update(u, { status: 'signed' });
    notify_(u.id, 'Đã ký hợp đồng', 'Bước tiếp theo: chọn 1 sản phẩm mẫu giảm 50%.', '/ctv/app.html');
    notify_('admin', u.full_name + ' đã ký hợp đồng', 'Mã CTV ' + u.ref_code, '/ctv/admin.html');
    return true;
  },

  /* ---------- Bước 3: đặt hàng mẫu -50% (1 lần) ---------- */
  products: function () { return catalog_(); },

  placeSample: function (r) {
    var u = auth_(r);
    if (u.status !== 'signed') throw new Error('Chỉ đặt hàng mẫu được sau khi ký hợp đồng');
    var t = table_('DonMau');
    if (t.find('ctv_id', u.id)) throw new Error('Bạn đã dùng quyền đặt hàng mẫu (chỉ 1 lần)');
    var p = catalog_().filter(function (x) { return x.id === r.product_id; })[0];
    if (!p) throw new Error('Không tìm thấy sản phẩm');
    var price = p.price, variant = '';
    if (r.variant) {
      var v = (p.variants || []).filter(function (x) { return x.name === r.variant; })[0];
      if (v) { variant = v.name; if (v.price > 0) price = v.price; }
    }
    if (!(price > 0)) throw new Error('Sản phẩm chưa có giá, vui lòng chọn sản phẩm khác');
    var phone = normPhone_(r.phone);
    if (!phone) throw new Error('SĐT nhận hàng không hợp lệ');
    var addr = clean_(r.address, 300);
    if (addr.length < 10) throw new Error('Vui lòng nhập địa chỉ nhận hàng đầy đủ');
    var row = {
      id: 'MAU' + Date.now().toString(36).toUpperCase(), created_at: now_(), ctv_id: u.id,
      ref_code: u.ref_code, product_id: p.id, product_name: p.name + (p.code ? ' (' + p.code + ')' : ''),
      variant: variant, web_price: price, sample_price: Math.round(price * SAMPLE_DISCOUNT),
      receiver: clean_(r.receiver, 80) || u.full_name, phone: phone, address: addr,
      note: clean_(r.note, 300), status: 'new'
    };
    t.insert(row);
    table_('CTV').update(u, { status: 'sample_ordered' });
    mailSample_(u, row);
    notify_('admin', 'Đơn mẫu mới – ' + u.full_name, row.product_name + ' · ' + fmt_(row.sample_price), '/ctv/admin.html');
    notify_(u.id, 'EYEMEDI đã nhận đơn mẫu', row.product_name + ' · ' + fmt_(row.sample_price) + '. EYEMEDI sẽ liên hệ giao hàng.', '/ctv/app.html');
    return row;
  },

  /* ---------- Bước 4: gửi video ---------- */
  submitVideo: function (r) {
    var u = auth_(r);
    if (u.status !== 'sample_received') throw new Error('Chỉ gửi video sau khi đã nhận sản phẩm mẫu');
    var url = clean_(r.url, 500);
    if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('Link video không hợp lệ');
    table_('Video').insert({
      id: 'VID' + Date.now().toString(36).toUpperCase(), created_at: now_(), ctv_id: u.id,
      ref_code: u.ref_code, url: url, note: clean_(r.note, 300), status: 'pending'
    });
    table_('CTV').update(u, { status: 'video_submitted' });
    notify_('admin', 'Video mới chờ duyệt', u.full_name + ' (' + u.ref_code + ')', '/ctv/admin.html');
    notify_(u.id, 'Đã gửi video', 'EYEMEDI sẽ duyệt trong 1–2 ngày làm việc.', '/ctv/app.html');
    return true;
  },

  /* ---------- Ghi nhận đơn từ eyemedi.vn (khách không đăng nhập) ---------- */
  recordOrder: function (r) {
    var code = String(r.order_code || '');
    if (!/^EM[A-Z0-9]{4,12}$/.test(code)) return false;
    // giới hạn ghi nhận đơn: tối đa 30 đơn / giờ cho mỗi mã CTV (chống gửi đơn giả hàng loạt)
    var rc = CacheService.getScriptCache(), rk = 'ro_' + String(r.ref || '').toUpperCase().slice(0, 12), n = Number(rc.get(rk) || 0);
    if (n >= 30) return false;
    rc.put(rk, String(n + 1), 3600);
    var u = table_('CTV').find('ref_code', String(r.ref || '').toUpperCase());
    if (!u || u.status === 'rejected' || u.status === 'locked') return false;
    return insertOrder_(u, code, r, now_());
  },

  /* Quản trị thêm tay đơn khách đặt qua link CTV nhưng chưa được ghi nhận (lấy từ Sheet đơn hàng, cột "Mã CTV"). */
  adminAddOrder: function (r) {
    admin_(r);
    var u = table_('CTV').find('ref_code', String(r.ref || '').trim().toUpperCase());
    if (!u) throw new Error('Không tìm thấy CTV có mã ' + String(r.ref || ''));
    var code = String(r.order_code || '').trim().toUpperCase() || ('EMTAY' + Date.now().toString(36).toUpperCase().slice(-6));
    if (!/^EM[A-Z0-9]{4,14}$/.test(code)) throw new Error('Mã đơn phải bắt đầu bằng EM, VD: EMLX3K9P2A');
    if (!(num_(r.total) > 0)) throw new Error('Nhập giá trị đơn');
    var d = String(r.date || '').trim(), at = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + ' 12:00:00' : now_();
    if (!insertOrder_(u, code, r, at)) throw new Error('Mã đơn ' + code + ' đã có trong danh sách');
    return true;
  },

  /* ====================== QUẢN TRỊ ====================== */
  /* Thông báo của tài khoản đang đăng nhập (admin nhận thêm thông báo quản trị). */
  notifications: function (r) {
    var u = auth_(r), isAdmin = u.is_admin === 'TRUE' || u.is_admin === 'true';
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ThongBao');
    if (!sh || sh.getLastRow() < 2) return { items: [], push: !!pushCfg_().app };
    var n = Math.min(3000, sh.getLastRow() - 1), start = sh.getLastRow() - n + 1;
    var vals = sh.getRange(start, 1, n, 6).getValues(), out = [];
    for (var i = vals.length - 1; i >= 0 && out.length < 60; i--) {
      var to = String(vals[i][2]);
      if (to === u.id || (isAdmin && to === 'admin'))
        out.push({ id: String(vals[i][0]), t: String(vals[i][1]), title: String(vals[i][3]), body: String(vals[i][4]), url: String(vals[i][5]), admin: to === 'admin' });
    }
    return { items: out, push: !!pushCfg_().app };
  },

  adminData: function (r) {
    admin_(r);
    var ctv = table_('CTV').all().map(function (u) {
      var o = {}; Object.keys(u).forEach(function (k) { if (k !== 'pw_salt' && k !== 'pw_hash' && k[0] !== '_') o[k] = u[k]; });
      return o;
    });
    return {
      ctv: ctv,
      contracts: table_('HopDong').all().map(strip_),
      samples: table_('DonMau').all().map(strip_),
      videos: table_('Video').all().map(strip_),
      orders: table_('DonHang').all().map(strip_)
    };
  },

  adminSetCtv: function (r) {
    admin_(r);
    var t = table_('CTV');
    var u = t.find('id', r.id);
    if (!u) throw new Error('Không tìm thấy CTV');
    var ch = {};
    if (r.status) { if (STATUSES.indexOf(r.status) < 0) throw new Error('Trạng thái sai'); ch.status = r.status; }
    if (r.commission_rate !== undefined) ch.commission_rate = String(r.commission_rate).trim() === '' ? '' : num_(r.commission_rate);
    if (r.admin_note !== undefined) ch.admin_note = clean_(r.admin_note, 500);
    if (r.new_password) {
      if (String(r.new_password).length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự');
      ch.pw_salt = Utilities.getUuid(); ch.pw_hash = hash_(ch.pw_salt, r.new_password);
    }
    var wasActive = u.status === 'active', oldStatus = u.status, oldRate = String(u.commission_rate);
    t.update(u, ch);
    if (ch.status === 'active' && !wasActive) openCommission_(u.id);
    if (ch.commission_rate !== undefined) recalc_(u.id, month_(now_()));
    var MSG = {
      approved: ['Hồ sơ đã được duyệt', 'Mời bạn ký hợp đồng cộng tác online để tiếp tục.'],
      rejected: ['Hồ sơ chưa được duyệt', ch.admin_note || u.admin_note || 'Vui lòng liên hệ EYEMEDI để biết thêm.'],
      locked: ['Tài khoản đã bị khóa', ch.admin_note || u.admin_note || 'Vui lòng liên hệ EYEMEDI.'],
      active: ['Tài khoản đang hoạt động', 'Hoa hồng của bạn đã được mở.']
    };
    if (ch.status && ch.status !== oldStatus && MSG[ch.status]) notify_(u.id, MSG[ch.status][0], MSG[ch.status][1], '/ctv/app.html');
    if (ch.pw_hash) notify_(u.id, 'EYEMEDI đã cấp lại mật khẩu', 'Hãy đăng nhập bằng mật khẩu mới và đổi lại mật khẩu của riêng bạn.', '/ctv/app.html');
    if (ch.commission_rate !== undefined && String(ch.commission_rate) !== oldRate)
      notify_(u.id, 'Cập nhật % hoa hồng', ch.commission_rate === '' ? 'Bạn hưởng hoa hồng theo bậc doanh thu tháng.' : 'Bạn được hưởng mức cố định ' + ch.commission_rate + '%.', '/ctv/app.html');
    return true;
  },

  adminSampleStatus: function (r) {
    admin_(r);
    var t = table_('DonMau');
    var s = t.find('id', r.id);
    if (!s) throw new Error('Không tìm thấy đơn mẫu');
    var SM = { confirmed: ['Đơn mẫu đã được xác nhận', 'EYEMEDI đang chuẩn bị hàng cho bạn.'],
      shipping: ['Đơn mẫu đang được giao', 'Bạn chú ý điện thoại để nhận hàng nhé.'],
      delivered: ['Đã nhận hàng mẫu', 'Hãy quay video review và gửi link trong ' + VIDEO_DAYS + ' ngày để mở hoa hồng.'],
      cancelled: ['Đơn mẫu đã hủy', 'Vui lòng liên hệ EYEMEDI nếu cần hỗ trợ.'] };
    if (r.status !== s.status && SM[r.status]) notify_(s.ctv_id, SM[r.status][0], s.product_name + '. ' + SM[r.status][1], '/ctv/app.html');
    t.update(s, { status: r.status });
    if (r.status === 'delivered') {
      var c = table_('CTV'); var u = c.find('id', s.ctv_id);
      if (u && u.status === 'sample_ordered') c.update(u, { status: 'sample_received' });
    }
    return true;
  },

  adminReviewVideo: function (r) {
    admin_(r);
    var t = table_('Video');
    var v = t.find('id', r.id);
    if (!v) throw new Error('Không tìm thấy video');
    t.update(v, { status: r.ok ? 'approved' : 'rejected', admin_note: clean_(r.note, 300) });
    var c = table_('CTV'); var u = c.find('id', v.ctv_id);
    if (u && u.status === 'video_submitted') { c.update(u, { status: r.ok ? 'active' : 'sample_received' }); if (r.ok) openCommission_(u.id); }
    notify_(v.ctv_id, r.ok ? 'Video đạt – đã mở hoa hồng!' : 'Video chưa đạt', r.ok ? 'Chúc mừng bạn, từ giờ mọi đơn giao thành công đều được tính hoa hồng.' : (clean_(r.note, 300) || 'Vui lòng quay lại và gửi video mới.'), '/ctv/app.html');
    return true;
  },

  adminOrder: function (r) {
    admin_(r);
    var t = table_('DonHang');
    var o = t.find('order_code', r.order_code);
    if (!o) throw new Error('Không tìm thấy đơn');
    var ch = {};
    if (r.status) ch.status = r.status;
    if (r.total !== undefined && r.total !== '') {
      ch.total = Math.round(num_(r.total));
    }
    if (r.paid !== undefined) { ch.paid = r.paid ? 'TRUE' : 'FALSE'; ch.paid_at = r.paid ? now_() : ''; }
    var before = { status: o.status, paid: o.paid };
    t.update(o, ch);
    recalc_(o.ctv_id, month_(o.created_at));
    var o2 = table_('DonHang').find('order_code', o.order_code) || o;
    var OS = { confirmed: 'đã được xác nhận', delivered: 'đã giao thành công', cancelled: 'đã bị hủy', returned: 'bị hoàn trả' };
    if (ch.status && ch.status !== before.status && OS[ch.status])
      notify_(o.ctv_id, 'Đơn ' + o.order_code + ' ' + OS[ch.status], ch.status === 'delivered' ?
        (eligible_(o2) ? 'Hoa hồng: ' + fmt_(o2.commission) + ' (' + o2.commission_rate + '%).' : 'Hoa hồng được mở sau khi video review được duyệt.') :
        'Giá trị đơn ' + fmt_(o2.total) + '.', '/ctv/app.html');
    if (ch.paid === 'TRUE' && before.paid !== 'TRUE')
      notify_(o.ctv_id, 'EYEMEDI đã thanh toán hoa hồng', 'Đơn ' + o.order_code + ': ' + fmt_(o2.commission) + '.', '/ctv/app.html');
    return true;
  }
};

/* ====================== HỢP ĐỒNG ====================== */
// Thông tin pháp lý Bên A – Giám đốc điền đúng theo Giấy chứng nhận đăng ký kinh doanh.
// Ô để trống sẽ in "…………" trên hợp đồng.
var BEN_A = {
  ten: 'HỘ KINH DOANH EYEMEDI',       // tên đúng theo giấy chứng nhận đăng ký
  mst: '035193007533',                // mã số thuế
  dia_chi: '63C Lạc Long Quân, Phường Hòa Bình, TP. Hồ Chí Minh',
  dai_dien: 'Trần Thị Huế',
  chuc_vu: 'Chủ hộ kinh doanh',
  dien_thoai: '0967 190 005'
};
var VIDEO_DAYS = 15;                  // số ngày phải gửi video sau khi nhận mẫu

function contractHtml_(u, info, signed) {
  var e = function (s) { var v = String(s == null ? '' : s).trim(); return v ? esc_(v) : '…………'; };
  var d = signed ? signed.at : now_();
  var ngay = 'ngày ' + d.slice(8, 10) + ' tháng ' + d.slice(5, 7) + ' năm ' + d.slice(0, 4);
  var f = fixedRate_(u);
  var hh = f !== null ? 'tỷ lệ cố định <b>' + f + '%</b>' :
    'tỷ lệ theo doanh thu tháng (tổng giá trị đơn đã giao trong tháng): ' +
    TIERS.map(function (t) { return t.label.replace(/\.000\.000đ/g, ' triệu').replace(/đ$/, '') + ': <b>' + t.rate + '%</b>'; }).join('; ') +
    '. Tỷ lệ của bậc đạt được áp dụng cho toàn bộ đơn đã giao trong tháng đó';
  var A = BEN_A;
  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4;margin:11mm 14mm}' +
    'body{font-family:"Times New Roman",Times,serif;font-size:11pt;line-height:1.33;margin:0;color:#000}' +
    'p{margin:0 0 3pt;text-align:justify}.c{text-align:center}h1{font-size:13pt;text-align:center;margin:5pt 0 1pt}' +
    'table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:0}b.d{display:inline}' +
    '</style></head><body>' +
    '<p class="c"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b>Độc lập – Tự do – Hạnh phúc</b></p>' +
    '<h1>HỢP ĐỒNG CỘNG TÁC VIÊN BÁN HÀNG</h1>' +
    '<p class="c">Số: ' + e(CONTRACT_VERSION + '/' + u.ref_code) + '</p>' +
    '<p><i>Căn cứ Bộ luật Dân sự 2015, Luật Thương mại 2005, Luật Giao dịch điện tử 2023 và nhu cầu của hai bên. Hôm nay, ' + ngay + ', chúng tôi gồm:</i></p>' +
    '<p><b>BÊN A: ' + e(A.ten) + '</b> – MST: ' + e(A.mst) + ' – Địa chỉ: ' + e(A.dia_chi) +
    '<br>Đại diện: ' + e(A.dai_dien) + ' – Chức vụ: ' + e(A.chuc_vu) + ' – Điện thoại: ' + e(A.dien_thoai) + '</p>' +
    '<p><b>BÊN B (' + e(u.kind) + '): ' + e(info.full_name) + '</b> – Ngày sinh: ' + e(info.dob) + ' – CCCD số: ' + e(info.id_number) + ', cấp ngày/nơi cấp: ' + e(info.id_issued) +
    '<br>Địa chỉ: ' + e(info.address) + ' – Điện thoại: ' + e(info.phone || u.phone) + ' – Email: ' + e(info.email) + ' – Mã CTV: <b>' + e(u.ref_code) + '</b>' +
    '<br>Tài khoản nhận hoa hồng: ' + e(u.bank_account) + ' – Ngân hàng: ' + e(u.bank_name) + ' – Chủ TK: ' + e(u.bank_holder) + '</p>' +
    '<p><b>Điều 1. Nội dung.</b> Bên B giới thiệu, quảng bá sản phẩm của Bên A đến khách hàng bằng đường link/mã CTV riêng; khách đặt hàng và thanh toán trực tiếp với Bên A. Bên B tự chủ thời gian, phương tiện làm việc. Hợp đồng này là hợp đồng dịch vụ, <b>không phải hợp đồng lao động</b>; Bên A không đóng bảo hiểm xã hội cho Bên B.</p>' +
    '<p><b>Điều 2. Sản phẩm mẫu và điều kiện kích hoạt.</b> Sau khi ký, Bên B được mua <b>01 lần duy nhất</b> 01 sản phẩm mẫu bằng 50% giá niêm yết trên eyemedi.vn. Trong ' + VIDEO_DAYS + ' ngày kể từ khi nhận hàng, Bên B đăng video trải nghiệm sản phẩm trên kênh của mình và gửi link cho Bên A. Quyền hưởng hoa hồng chỉ phát sinh sau khi Bên A duyệt video' + (RETRO_COMMISSION ? ' (khi đó các đơn đã giao trước đó, chưa thanh toán, cũng được tính hoa hồng). ' : '; đơn hàng phát sinh trước thời điểm duyệt video không được tính hoa hồng. ') + 'Bên B đồng ý cho Bên A chia sẻ lại video này trên các kênh của Bên A, có ghi nguồn.</p>' +
    '<p><b>Điều 3. Hoa hồng và thanh toán.</b> Hoa hồng tính trên giá trị thực thu (sau giảm giá, không gồm phí vận chuyển) của đơn hàng phát sinh từ link/mã của Bên B và <b>đã giao thành công</b>; đơn hủy, hoàn trả không tính. Mức hoa hồng: ' + hh + '. Hai bên đối soát trên trang CTV trước ngày 10 hằng tháng; Bên A chuyển khoản hoa hồng tháng trước vào tài khoản nêu trên trước ngày 15.</p>' +
    '<p><b>Điều 4. Thuế.</b> Hoa hồng là thu nhập của Bên B. <b>Bên B tự kê khai và nộp thuế thu nhập cá nhân (và các khoản thuế khác nếu có) theo đúng quy định của pháp luật</b>, tự chịu trách nhiệm về nghĩa vụ thuế của mình. Trường hợp pháp luật bắt buộc Bên A khấu trừ thuế tại nguồn, Bên A sẽ khấu trừ trước khi chi trả và cấp chứng từ khấu trừ thuế cho Bên B; Bên B cung cấp mã số thuế cá nhân khi Bên A yêu cầu.</p>' +
    '<p><b>Điều 5. Trách nhiệm Bên B.</b> Cung cấp thông tin trung thực theo tài liệu Bên A công bố; không quảng cáo sai sự thật, không tự hứa giá, khuyến mãi hay công dụng chữa bệnh; tuân thủ Luật Quảng cáo và quy định ghi rõ nội dung quảng cáo trên mạng xã hội; không spam, không gian lận, không tự đặt hàng qua mã của mình để hưởng hoa hồng; bảo mật thông tin khách hàng; giữ uy tín thương hiệu EYEMEDI.</p>' +
    '<p><b>Điều 6. Trách nhiệm Bên A.</b> Cung cấp thông tin, hình ảnh sản phẩm; chịu trách nhiệm về chất lượng, giao hàng, bảo hành và chăm sóc khách hàng; cập nhật đơn hàng, hoa hồng minh bạch trên trang CTV; chi trả hoa hồng đúng hạn.</p>' +
    '<p><b>Điều 7. Chấm dứt.</b> Mỗi bên được đơn phương chấm dứt hợp đồng bằng thông báo trước 07 ngày; hoa hồng của đơn đã giao trước ngày chấm dứt vẫn được thanh toán. Nếu Bên B vi phạm Điều 5, Bên A được chấm dứt ngay, khóa tài khoản và không chi trả hoa hồng cho các đơn vi phạm.</p>' +
    '<p><b>Điều 8. Hiệu lực.</b> Hợp đồng được giao kết bằng phương tiện điện tử, có giá trị pháp lý như bản giấy, hiệu lực 12 tháng kể từ ngày ký và tự động gia hạn nếu không bên nào có ý kiến khác. Tranh chấp được thương lượng; nếu không thành, đưa ra Tòa án có thẩm quyền nơi Bên A đăng ký kinh doanh. Mỗi bên lưu 01 bản điện tử.</p>' +
    '<table style="margin-top:6pt"><tr><td class="c" style="width:50%"><b>ĐẠI DIỆN BÊN A</b><br><i style="font-size:9pt">' + (signed ? 'Đã chấp thuận điện tử lúc ' + esc_(signed.at) : '') + '</i><br><br>' + e(A.dai_dien) + '</td>' +
    '<td class="c"><b>BÊN B</b><br>' + (signed ? '<img src="' + signed.sig + '" style="height:56px"><br>' : '<br><br>') + e(info.full_name) +
    (signed ? '<br><i style="font-size:9pt">Ký điện tử lúc ' + esc_(signed.at) + '</i>' : '') + '</td></tr></table>' +
    '</body></html>';
}

/* ====================== HOA HỒNG THEO BẬC ====================== */
function month_(d) { return String(d || '').slice(0, 7); }      // 'yyyy-MM'
function fixedRate_(u) { var v = String(u.commission_rate == null ? '' : u.commission_rate).trim(); return v === '' ? null : num_(v); }
function tierIndex_(rev) {
  var k = 0;
  for (var i = 0; i < TIERS.length; i++) if (TIERS[i].above ? rev > TIERS[i].from : rev >= TIERS[i].from) k = i;
  return k;
}
/** Doanh thu đơn đã giao trong tháng + bậc hiện tại + bậc kế tiếp. */
function monthSummary_(u, m) {
  m = m || month_(now_());
  var rev = 0, cnt = 0;
  table_('DonHang').all().forEach(function (o) {
    if (o.ctv_id === u.id && o.status === 'delivered' && eligible_(o) && month_(o.created_at) === m) { rev += num_(o.total); cnt++; }
  });
  var fixed = fixedRate_(u), k = tierIndex_(rev), next = TIERS[k + 1];
  return {
    month: m, revenue: rev, delivered: cnt, fixed: fixed !== null,
    rate: fixed !== null ? fixed : TIERS[k].rate, tier: k,
    next: fixed !== null || !next ? null : { rate: next.rate, need: Math.max(0, next.from - rev + (next.above ? 1 : 0)) }
  };
}
function insertOrder_(u, code, r, at) {
  var t = table_('DonHang');
  if (t.find('order_code', code)) return false;
  var total = Math.max(0, Math.round(num_(r.total)));
  var on = u.status === 'active';
  t.insert({
    order_code: code, created_at: at, ref_code: u.ref_code, ctv_id: u.id,
    customer_name: clean_(r.name, 120), customer_phone: clean_(r.phone, 20),
    items: clean_(r.items, 3000), total: total, commission_rate: 0, commission: 0,
    status: 'new', paid: 'FALSE', page: clean_(r.page, 200), eligible: on ? 'TRUE' : 'FALSE'
  });
  recalc_(u.id, month_(at));   // tính % và hoa hồng theo bậc của tháng
  notify_(u.id, 'Có đơn hàng mới qua link của bạn', 'Mã ' + code + ' · ' + fmt_(total) + '. Hoa hồng tính khi đơn giao thành công.', '/ctv/app.html');
  notify_('admin', 'Đơn mới từ CTV ' + u.full_name, 'Mã ' + code + ' · ' + fmt_(total), '/ctv/admin.html');
  return true;
}

/* ====================== THÔNG BÁO ====================== */
function fmt_(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'; }
function pushCfg_() {
  var p = PropertiesService.getScriptProperties();
  return { app: p.getProperty('ONESIGNAL_APP_ID') || '', key: p.getProperty('ONESIGNAL_KEY') || '' };
}
/** Ghi 1 thông báo cho 1 CTV (to = id) hoặc cho quản trị (to = 'admin'), và gửi thông báo đẩy nếu đã cài OneSignal. Không bao giờ làm hỏng thao tác chính. */
function notify_(to, title, body, url) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('ThongBao');
    if (!sh) {
      sh = ss.insertSheet('ThongBao');
      sh.getRange(1, 1, 1, SHEETS.ThongBao.length).setValues([SHEETS.ThongBao]).setFontWeight('bold');
      sh.setFrozenRows(1); sh.getRange('A:Z').setNumberFormat('@');
    }
    sh.appendRow(['TB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      now_(), String(to), cell_(clean_(title, 150)), cell_(clean_(body, 400)), String(url || '')]);
  } catch (e) { Logger.log('Không ghi được thông báo: ' + e); }
  try {
    var cfg = pushCfg_();
    if (!cfg.app || !cfg.key) return;
    var ids = to === 'admin' ? table_('CTV').all().filter(function (x) { return x.is_admin === 'TRUE' || x.is_admin === 'true'; }).map(function (x) { return x.id; }) : [String(to)];
    if (!ids.length) return;
    UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Key ' + cfg.key },
      payload: JSON.stringify({ app_id: cfg.app, target_channel: 'push', include_aliases: { external_id: ids },
        headings: { en: String(title) }, contents: { en: String(body || title) }, url: SITE + (url || '/ctv/app.html') })
    });
  } catch (e) { Logger.log('Không gửi được thông báo đẩy: ' + e); }
}

/**
 * CÀI THÔNG BÁO ĐẨY (OneSignal): điền 2 dòng dưới (lấy trong OneSignal → Settings → Keys & IDs) → chọn hàm caiThongBaoDay → Chạy.
 * Chạy xong XÓA khóa REST API khỏi code (khóa đã được lưu an toàn trong Thuộc tính tập lệnh). Không cần triển khai lại.
 */
function caiThongBaoDay() {
  var ONESIGNAL_APP_ID = '';     // VD: 'a1b2c3d4-....'
  var ONESIGNAL_REST_KEY = '';   // "REST API Key" (bắt đầu bằng os_v2_...)
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) { Logger.log('Điền đủ ONESIGNAL_APP_ID và ONESIGNAL_REST_KEY rồi chạy lại.'); return; }
  PropertiesService.getScriptProperties().setProperties({ ONESIGNAL_APP_ID: ONESIGNAL_APP_ID.trim(), ONESIGNAL_KEY: ONESIGNAL_REST_KEY.trim() });
  notify_('admin', 'Đã bật thông báo đẩy', 'Từ giờ hoạt động của CTV sẽ báo về điện thoại.', '/ctv/admin.html');
  Logger.log('Đã lưu. Đã gửi 1 thông báo thử tới tài khoản quản trị (nếu điện thoại đã bật thông báo). Nhớ xóa khóa khỏi code.');
}

/** Đơn có được tính hoa hồng không (đơn cũ không có cột eligible = được tính). */
function eligible_(o) { return o.eligible !== 'FALSE'; }
/** Gọi khi CTV được mở hoa hồng: nếu RETRO_COMMISSION thì tính hoa hồng cho đơn chưa trả bán trước đó. */
function openCommission_(ctvId) {
  if (!RETRO_COMMISSION) return;
  var t = table_('DonHang'), months = {};
  t.all().forEach(function (o) {
    if (o.ctv_id === ctvId && o.eligible === 'FALSE' && o.paid !== 'TRUE') { t.update(o, { eligible: 'TRUE' }); months[month_(o.created_at)] = 1; }
  });
  Object.keys(months).forEach(function (m) { recalc_(ctvId, m); });
}
/** Tính lại % và hoa hồng cho mọi đơn CHƯA TRẢ của CTV trong tháng m. */
function recalc_(ctvId, m) {
  var u = table_('CTV').find('id', ctvId);
  if (!u || !m) return;
  var rate = monthSummary_(u, m).rate;
  var t = table_('DonHang');
  t.all().forEach(function (o) {
    if (o.ctv_id !== ctvId || month_(o.created_at) !== m || o.paid === 'TRUE') return;
    var rt = eligible_(o) ? rate : 0, c = Math.round(num_(o.total) * rt / 100);
    if (num_(o.commission_rate) !== rt || num_(o.commission) !== c) t.update(o, { commission_rate: rt, commission: c });
  });
}

/* ====================== DỮ LIỆU ====================== */
function table_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Chưa chạy hàm caiDat');
  var head = SHEETS[name];
  if (sh.getLastColumn() < head.length) sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); // thêm cột mới
  var vals = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues() : [];
  var rows = vals.map(function (v, i) {
    var o = { _row: i + 2 }; head.forEach(function (h, j) { o[h] = v[j] === null ? '' : String(v[j]); }); return o;
  });
  return {
    all: function () { return rows; },
    find: function (k, val) {
      var want = String(val);
      for (var i = 0; i < rows.length; i++) {
        var v = rows[i][k];
        if (v === want || (k === 'phone' && want && normPhone_(v) === want) ||
            ((k === 'email' || k === 'username') && want && v.trim().toLowerCase() === want.toLowerCase())) return rows[i];
      }
      return null;
    },
    filterBy: function (k, val) { return rows.filter(function (r) { return r[k] === String(val); }).map(strip_); },
    insert: function (o) {
      sh.appendRow(head.map(function (h) { return o[h] === undefined ? '' : cell_(o[h]); }));
    },
    update: function (row, ch) {
      Object.keys(ch).forEach(function (k) {
        var j = head.indexOf(k); if (j < 0) return;
        sh.getRange(row._row, j + 1).setValue(cell_(ch[k])); row[k] = String(ch[k]);
      });
    },
    remove: function (row) { sh.deleteRow(row._row); }
  };
}

function catalog_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('catalog');
  if (c) return JSON.parse(c);
  var res = UrlFetchApp.fetch(SITE + '/ctv/san-pham.json?t=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Không tải được danh sách sản phẩm');
  var list = JSON.parse(res.getContentText());
  try { cache.put('catalog', JSON.stringify(list), 600); } catch (e) {}
  return list;
}

/* ====================== ĐĂNG NHẬP ====================== */
function hash_(salt, pw) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + String(pw || ''), Utilities.Charset.UTF_8);
  for (var i = 0; i < 999; i++) b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b.concat(Utilities.newBlob(salt).getBytes()));
  return Utilities.base64Encode(b);
}

function newSession_(id) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var exp = Date.now() + SESSION_DAYS * 864e5;
  table_('PhienDangNhap').insert({ token: token, ctv_id: id, expires: exp });
  return token;
}

function auth_(r) {
  var token = String(r.token || '');
  if (token.length < 40) throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
  var cache = CacheService.getScriptCache();
  var id = cache.get('s_' + token);
  if (!id) {
    var s = table_('PhienDangNhap').find('token', token);
    if (!s || Number(s.expires) < Date.now()) throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
    id = s.ctv_id; cache.put('s_' + token, id, 3600);
  }
  var u = table_('CTV').find('id', id);
  if (!u) throw new Error('Không tìm thấy tài khoản');
  if (u.status === 'locked') throw new Error('Tài khoản đã bị khóa');
  return u;
}

function admin_(r) {
  var u = auth_(r);
  if (u.is_admin !== 'TRUE' && u.is_admin !== 'true') throw new Error('Không có quyền quản trị');
  return u;
}

/**
 * ĐẶT LẠI MẬT KHẨU khi CTV / admin quên: sửa 2 dòng dưới rồi chọn hàm datLaiMatKhau → Chạy.
 * Không cần triển khai lại.
 */
function datLaiMatKhau() {
  var SO_DIEN_THOAI = '';   // SĐT, email hoặc tên đăng nhập. VD: '0901234567'
  var MAT_KHAU_MOI = '';    // mật khẩu mới, tối thiểu 6 ký tự
  if (MAT_KHAU_MOI.length < 6) { Logger.log('Nhập mật khẩu mới tối thiểu 6 ký tự'); return; }
  var t = table_('CTV'), u = findLogin_(SO_DIEN_THOAI);
  if (!u) { Logger.log('Không tìm thấy "' + SO_DIEN_THOAI + '" trong tab CTV. Chạy hàm kiemTraTaiKhoan để xem chi tiết.'); return; }
  var salt = Utilities.getUuid();
  t.update(u, { pw_salt: salt, pw_hash: hash_(salt, MAT_KHAU_MOI) });
  moKhoaDangNhap_(SO_DIEN_THOAI);
  Logger.log('Đã đặt lại mật khẩu cho ' + u.full_name + ' (SĐT ' + u.phone + ', email ' + (u.email || 'trống') + ').');
}

/**
 * KIỂM TRA TÀI KHOẢN khi ai đó báo không đăng nhập được: điền dòng TIM (và MAT_KHAU_THU nếu muốn thử mật khẩu)
 * rồi chọn hàm kiemTraTaiKhoan → Chạy → xem "Nhật ký thực thi". Hàm cũng gỡ tạm khóa do nhập sai nhiều lần.
 */
function kiemTraTaiKhoan() {
  var TIM = '';             // SĐT, email hoặc tên đăng nhập đã nhập ở ô đăng nhập
  var MAT_KHAU_THU = '';    // (không bắt buộc) mật khẩu muốn thử. Xóa sau khi chạy.
  var t = table_('CTV'), rows = t.all(), q = String(TIM).trim();
  Logger.log('Tab CTV có ' + rows.length + ' tài khoản. Đang tìm: "' + q + '"');
  var u = findLogin_(q);
  if (!u) {
    var frag = q.toLowerCase().replace(/@.*/, '').replace(/^0/, '').slice(0, 8);
    var near = rows.filter(function (x) {
      return frag && (String(x.email).toLowerCase().indexOf(frag) >= 0 || String(x.phone).indexOf(frag) >= 0 ||
        String(x.username).toLowerCase().indexOf(frag) >= 0 || String(x.full_name).toLowerCase().indexOf(frag) >= 0);
    });
    Logger.log('KHÔNG tìm thấy tài khoản khớp. ' + (q.indexOf('@') > 0 ? 'Đăng nhập bằng email chỉ được khi email nằm trong cột "email" của tab CTV (email nhập lúc đăng ký, ký hợp đồng hoặc lưu ở trang CTV).' : ''));
    near.forEach(function (x) { Logger.log('  Gần giống – dòng ' + x._row + ': ' + x.full_name + ' | SĐT ' + x.phone + ' | email "' + x.email + '" | user "' + x.username + '"'); });
    if (!near.length) Logger.log('  Không có dòng nào gần giống. Tài khoản có thể chưa đăng ký.');
  } else {
    Logger.log('Tìm thấy dòng ' + u._row + ': ' + u.full_name + ' | SĐT ' + u.phone + ' | email "' + u.email + '" | user "' + u.username +
      '" | trạng thái ' + u.status + ' | admin ' + u.is_admin);
    if (!u.pw_hash || !u.pw_salt) Logger.log('  Tài khoản CHƯA có mật khẩu (cột pw_salt/pw_hash trống) → chạy datLaiMatKhau.');
    if (u.status === 'locked') Logger.log('  Tài khoản đang bị KHÓA (status = locked).');
    if (MAT_KHAU_THU) Logger.log('  Mật khẩu thử: ' + (pwOk_(u, MAT_KHAU_THU) ? 'ĐÚNG' : 'SAI (' + MAT_KHAU_THU.length + ' ký tự) → chạy datLaiMatKhau để đặt lại'));
  }
  Logger.log(moKhoaDangNhap_(q) ? 'Đã gỡ tạm khóa do nhập sai nhiều lần.' : 'Không bị tạm khóa do nhập sai.');
}

function pwOk_(u, pw) {
  if (!u.pw_salt || !u.pw_hash) return false;
  pw = String(pw == null ? '' : pw);
  return hash_(u.pw_salt, pw) === u.pw_hash || (pw.trim() !== pw && hash_(u.pw_salt, pw.trim()) === u.pw_hash);
}
function loginKey_(id) { return 'lf_' + sha_(String(id || '').trim().toLowerCase()).slice(0, 40); }
function moKhoaDangNhap_(id) {
  var c = CacheService.getScriptCache(), k = loginKey_(id), had = Number(c.get(k) || 0) >= 8;
  c.remove(k); return had;
}

/**
 * TẠO TÀI KHOẢN QUẢN TRỊ: sửa các dòng dưới rồi chọn hàm taoAdmin → Chạy.
 * Đăng nhập bằng TEN_DANG_NHAP hoặc EMAIL. Tài khoản đã có thì chỉ cấp quyền admin và đặt lại mật khẩu.
 */
function taoAdmin() {
  var TEN_DANG_NHAP = 'admin';
  var EMAIL = '';          // VD: 'quanly@gmail.com' (có thể để trống)
  var MAT_KHAU = '';       // tối thiểu 6 ký tự
  var HO_TEN = 'Quản trị EYEMEDI';
  caiDat();                // bổ sung cột mới nếu Sheet tạo từ bản cũ
  var user = String(TEN_DANG_NHAP).trim().toLowerCase();
  var email = String(EMAIL).trim().toLowerCase();
  if (!/^[a-z][a-z0-9._]{2,30}$/.test(user)) { Logger.log('Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới'); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Logger.log('Email không hợp lệ'); return; }
  if (MAT_KHAU.length < 6) { Logger.log('Mật khẩu tối thiểu 6 ký tự'); return; }
  var t = table_('CTV'), u = t.find('username', user) || (email && t.find('email', email)), salt = Utilities.getUuid();
  if (u) {
    t.update(u, { username: user, email: email || u.email, is_admin: 'TRUE', status: 'active', pw_salt: salt, pw_hash: hash_(salt, MAT_KHAU) });
  } else {
    var code;
    do { code = 'AD' + Math.random().toString(36).slice(2, 7).toUpperCase(); } while (t.find('ref_code', code));
    t.insert({ id: Utilities.getUuid(), created_at: now_(), full_name: HO_TEN, phone: '', email: email,
      kind: 'CTV', channels: '', ref_code: code, status: 'active', commission_rate: '', is_admin: 'TRUE',
      pw_salt: salt, pw_hash: hash_(salt, MAT_KHAU), username: user });
  }
  Logger.log('Xong. Đăng nhập tại eyemedi.vn/ctv/ bằng "' + user + '"' + (email ? ' hoặc ' + email : '') + ' rồi mở trang Quản trị.');
}

/** Email nhận thông báo: email của các tài khoản quản trị (cột is_admin = TRUE), nếu không có thì gửi về chủ Apps Script. */
function adminEmails_() {
  var list = table_('CTV').all().filter(function (u) {
    return (u.is_admin === 'TRUE' || u.is_admin === 'true') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(u.email).trim());
  }).map(function (u) { return String(u.email).trim().toLowerCase(); });
  list = list.filter(function (e, i) { return list.indexOf(e) === i; });
  if (!list.length) { try { list = [Session.getEffectiveUser().getEmail()]; } catch (e) {} }
  return list.filter(String);
}

/** Gửi email khi CTV đặt đơn mẫu: 1 email cho quản trị, 1 email xác nhận cho CTV (nếu có email). Lỗi gửi mail không làm hỏng đơn. */
function mailSample_(u, s) {
  var money = function (n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'; };
  var rows = [['Mã đơn mẫu', s.id], ['Thời gian', s.created_at], ['CTV', u.full_name + ' – ' + u.phone + ' – Mã ' + u.ref_code],
    ['Sản phẩm', s.product_name + (s.variant ? ' – ' + s.variant : '')], ['Giá web', money(s.web_price)],
    ['Giá mẫu (-' + Math.round(SAMPLE_DISCOUNT * 100) + '%)', money(s.sample_price)], ['Người nhận', s.receiver],
    ['SĐT nhận', s.phone], ['Địa chỉ', s.address], ['Ghi chú', s.note || '']];
  var table = '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' + rows.map(function (r) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top">' + esc_(r[0]) + '</td><td style="padding:6px 0"><b>' + esc_(r[1]) + '</b></td></tr>';
  }).join('') + '</table>';
  var text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
  try {
    var to = adminEmails_();
    if (to.length) MailApp.sendEmail({
      to: to.join(','), name: 'EYEMEDI Cộng tác viên', replyTo: /@/.test(u.email) ? u.email : undefined,
      subject: '[Đơn mẫu CTV] ' + s.id + ' – ' + u.full_name + ' – ' + money(s.sample_price),
      body: 'Có đơn hàng mẫu mới từ CTV:\n\n' + text + '\n\nXử lý tại ' + SITE + '/ctv/admin.html',
      htmlBody: '<div style="font-family:Arial,sans-serif;color:#222"><p>Có <b>đơn hàng mẫu mới</b> từ CTV:</p>' + table +
        '<p style="margin-top:18px"><a href="' + SITE + '/ctv/admin.html" style="background:#0b5558;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Mở trang quản trị</a></p></div>'
    });
  } catch (e) { Logger.log('Không gửi được email đơn mẫu cho quản trị: ' + e); }
  try {
    var em = String(u.email || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) MailApp.sendEmail({
      to: em, name: 'EYEMEDI Cộng tác viên',
      subject: 'EYEMEDI đã nhận đơn hàng mẫu ' + s.id,
      body: 'Chào ' + u.full_name + ',\n\nEYEMEDI đã nhận đơn hàng mẫu của bạn:\n\n' + text + '\n\nEYEMEDI sẽ liên hệ xác nhận và giao hàng sớm.\nEYEMEDI',
      htmlBody: '<div style="font-family:Arial,sans-serif;color:#222"><p>Chào <b>' + esc_(u.full_name) + '</b>,</p><p>EYEMEDI đã nhận đơn hàng mẫu của bạn:</p>' + table +
        '<p>EYEMEDI sẽ liên hệ xác nhận và giao hàng sớm. Theo dõi tại <a href="' + SITE + '/ctv/app.html">trang cộng tác viên</a>.</p><p>EYEMEDI</p></div>'
    });
  } catch (e) { Logger.log('Không gửi được email xác nhận cho CTV: ' + e); }
}

/** Tìm tài khoản theo SĐT, email hoặc tên đăng nhập. */
function findLogin_(v) {
  var id = String(v || '').trim(), t = table_('CTV');
  if (id.indexOf('@') > 0) return t.find('email', id.toLowerCase());
  if (normPhone_(id)) return t.find('phone', normPhone_(id));
  return id ? t.find('username', id.toLowerCase()) : null;
}

function sha_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8));
}

/** Bảng lưu link đặt lại mật khẩu (tự tạo nếu chưa có). */
function resetTable_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('DatLaiMK')) {
    var sh = ss.insertSheet('DatLaiMK'), head = SHEETS.DatLaiMK;
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.getRange('A:Z').setNumberFormat('@');
  }
  return table_('DatLaiMK');
}

/**
 * Chạy 1 lần sau khi dán code: cấp quyền gửi email cho chức năng "Quên mật khẩu"
 * và gửi 1 email thử về chính tài khoản Google đang chạy.
 */
function capQuyenGuiMail() {
  var me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(me, 'EYEMEDI CTV – thử gửi email', 'Chức năng Quên mật khẩu đã gửi được email. Còn ' +
    MailApp.getRemainingDailyQuota() + ' lượt gửi hôm nay.');
  resetTable_();
  Logger.log('Đã gửi email thử tới ' + me + '. Nhớ Triển khai → Quản lý triển khai → Phiên bản mới.');
}

/** Chạy tay định kỳ (hoặc đặt trình kích hoạt hằng ngày) để xóa phiên hết hạn. */
function donPhienHetHan() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PhienDangNhap');
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) if (Number(v[i][2]) < Date.now()) sh.deleteRow(i + 1);
}

/* ====================== TIỆN ÍCH ====================== */
function publicMe_(u) {
  return pick_(u, ['id', 'full_name', 'phone', 'email', 'kind', 'channels', 'ref_code', 'status',
                   'commission_rate', 'bank_name', 'bank_account', 'bank_holder', 'admin_note', 'is_admin', 'created_at']);
}
function pick_(o, keys) { if (!o) return null; var r = {}; keys.forEach(function (k) { r[k] = o[k]; }); return r; }
function strip_(o) { var r = {}; Object.keys(o).forEach(function (k) { if (k[0] !== '_') r[k] = o[k]; }); return r; }
function clean_(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/^[=+\-@]+/, '').trim().slice(0, n); }
function num_(x) { var n = Number(String(x).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
function now_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'); }
// Giữ giá trị ở dạng chữ: SĐT không mất số 0 đầu, chuỗi bắt đầu bằng = + - @ không bị hiểu là công thức.
function cell_(v) {
  var s = String(v);
  return /^[=+\-@]/.test(s) || /^0\d+$/.test(s) ? "'" + s : s;
}
function emailTaken_(email, myId) {
  var o = email && table_('CTV').find('email', email);
  if (o && o.id !== myId) throw new Error('Email này đã được dùng cho tài khoản khác');
}
function normPhone_(p) {
  var s = String(p || '').replace(/\D/g, '');
  if (s.indexOf('84') === 0 && s.length === 11) s = '0' + s.slice(2);
  if (/^[1-9]\d{8}$/.test(s)) s = '0' + s;   // ô Sheet đã mất số 0 đầu
  return /^0\d{9}$/.test(s) ? s : '';
}
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
