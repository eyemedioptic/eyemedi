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
        'pw_salt', 'pw_hash'],
  HopDong: ['ctv_id', 'ref_code', 'signed_at', 'version', 'full_name', 'id_number', 'id_issued',
            'address', 'pdf_url', 'user_agent', 'dob', 'phone', 'email'],
  DonMau: ['id', 'created_at', 'ctv_id', 'ref_code', 'product_id', 'product_name', 'variant',
           'web_price', 'sample_price', 'receiver', 'phone', 'address', 'note', 'status'],
  Video: ['id', 'created_at', 'ctv_id', 'ref_code', 'url', 'note', 'status', 'admin_note'],
  DonHang: ['order_code', 'created_at', 'ref_code', 'ctv_id', 'customer_name', 'customer_phone',
            'items', 'total', 'commission_rate', 'commission', 'status', 'paid', 'paid_at', 'page'],
  PhienDangNhap: ['token', 'ctv_id', 'expires']
};

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
    var code = String(r.ref_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (code.length < 4 || t.find('ref_code', code)) {
      do { code = 'EM' + Math.random().toString(36).slice(2, 7).toUpperCase(); } while (t.find('ref_code', code));
    }
    var salt = Utilities.getUuid();
    var kind = ['CTV', 'KOL', 'KOC'].indexOf(r.kind) >= 0 ? r.kind : 'CTV';
    var row = {
      id: Utilities.getUuid(), created_at: now_(), full_name: name, phone: phone,
      email: clean_(r.email, 120), kind: kind, channels: clean_(r.channels, 500), ref_code: code,
      status: 'pending', commission_rate: '', is_admin: 'FALSE',
      pw_salt: salt, pw_hash: hash_(salt, r.password)
    };
    t.insert(row);
    return { token: newSession_(row.id), me: publicMe_(row) };
  },

  login: function (r) {
    var phone = normPhone_(r.phone);
    var u = phone && table_('CTV').find('phone', phone);
    if (!u || hash_(u.pw_salt, r.password) !== u.pw_hash) throw new Error('Sai số điện thoại hoặc mật khẩu');
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
        paid: o.paid === 'TRUE', paid_at: o.paid_at,
        customer_name: String(o.customer_name || '').slice(0, 1) + '***',
        customer_phone: '*******' + String(o.customer_phone || '').slice(-3)
      };
    }).reverse();
    out.orders = orders;
    out.month = monthSummary_(u);
    out.tiers = TIERS;
    return out;
  },

  updateProfile: function (r) {
    var u = auth_(r);
    var t = table_('CTV');
    t.update(u, {
      email: clean_(r.email, 120), channels: clean_(r.channels, 500),
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
    return true;
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
    return true;
  },

  /* ---------- Ghi nhận đơn từ eyemedi.vn (khách không đăng nhập) ---------- */
  recordOrder: function (r) {
    var code = String(r.order_code || '');
    if (!/^EM[A-Z0-9]{4,12}$/.test(code)) return false;
    var u = table_('CTV').find('ref_code', String(r.ref || '').toUpperCase());
    if (!u || u.status !== 'active') return false;
    var t = table_('DonHang');
    if (t.find('order_code', code)) return false;
    var total = Math.max(0, Math.round(num_(r.total)));
    var rate = fixedRate_(u);
    if (rate === null) rate = monthSummary_(u, month_(now_())).rate;
    t.insert({
      order_code: code, created_at: now_(), ref_code: u.ref_code, ctv_id: u.id,
      customer_name: clean_(r.name, 120), customer_phone: clean_(r.phone, 20),
      items: clean_(r.items, 3000), total: total, commission_rate: rate,
      commission: Math.round(total * rate / 100), status: 'new', paid: 'FALSE',
      page: clean_(r.page, 200)
    });
    recalc_(u.id, month_(now_()));
    return true;
  },

  /* ====================== QUẢN TRỊ ====================== */
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
    t.update(u, ch);
    if (ch.commission_rate !== undefined) recalc_(u.id, month_(now_()));
    return true;
  },

  adminSampleStatus: function (r) {
    admin_(r);
    var t = table_('DonMau');
    var s = t.find('id', r.id);
    if (!s) throw new Error('Không tìm thấy đơn mẫu');
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
    if (u && u.status === 'video_submitted') c.update(u, { status: r.ok ? 'active' : 'sample_received' });
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
    t.update(o, ch);
    recalc_(o.ctv_id, month_(o.created_at));
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
    '<p><b>Điều 2. Sản phẩm mẫu và điều kiện kích hoạt.</b> Sau khi ký, Bên B được mua <b>01 lần duy nhất</b> 01 sản phẩm mẫu bằng 50% giá niêm yết trên eyemedi.vn. Trong ' + VIDEO_DAYS + ' ngày kể từ khi nhận hàng, Bên B đăng video trải nghiệm sản phẩm trên kênh của mình và gửi link cho Bên A. Quyền hưởng hoa hồng chỉ phát sinh sau khi Bên A duyệt video. Bên B đồng ý cho Bên A chia sẻ lại video này trên các kênh của Bên A, có ghi nguồn.</p>' +
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
    if (o.ctv_id === u.id && o.status === 'delivered' && month_(o.created_at) === m) { rev += num_(o.total); cnt++; }
  });
  var fixed = fixedRate_(u), k = tierIndex_(rev), next = TIERS[k + 1];
  return {
    month: m, revenue: rev, delivered: cnt, fixed: fixed !== null,
    rate: fixed !== null ? fixed : TIERS[k].rate, tier: k,
    next: fixed !== null || !next ? null : { rate: next.rate, need: Math.max(0, next.from - rev + (next.above ? 1 : 0)) }
  };
}
/** Tính lại % và hoa hồng cho mọi đơn CHƯA TRẢ của CTV trong tháng m. */
function recalc_(ctvId, m) {
  var u = table_('CTV').find('id', ctvId);
  if (!u || !m) return;
  var rate = monthSummary_(u, m).rate;
  var t = table_('DonHang');
  t.all().forEach(function (o) {
    if (o.ctv_id !== ctvId || month_(o.created_at) !== m || o.paid === 'TRUE') return;
    var c = Math.round(num_(o.total) * rate / 100);
    if (num_(o.commission_rate) !== rate || num_(o.commission) !== c) t.update(o, { commission_rate: rate, commission: c });
  });
}

/* ====================== DỮ LIỆU ====================== */
function table_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Chưa chạy hàm caiDat');
  var head = SHEETS[name];
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
        if (v === want || (k === 'phone' && want && normPhone_(v) === want)) return rows[i];
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
  var SO_DIEN_THOAI = '';   // VD: '0901234567'
  var MAT_KHAU_MOI = '';    // mật khẩu mới, tối thiểu 6 ký tự
  if (MAT_KHAU_MOI.length < 6) { Logger.log('Nhập mật khẩu mới tối thiểu 6 ký tự'); return; }
  var phone = normPhone_(SO_DIEN_THOAI);
  var t = table_('CTV'), u = t.find('phone', phone);
  if (!u) { Logger.log('Không tìm thấy SĐT ' + phone + ' trong tab CTV'); return; }
  var salt = Utilities.getUuid();
  t.update(u, { phone: phone, pw_salt: salt, pw_hash: hash_(salt, MAT_KHAU_MOI) });
  Logger.log('Đã đặt lại mật khẩu cho ' + u.full_name + ' (' + phone + ').');
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
function normPhone_(p) {
  var s = String(p || '').replace(/\D/g, '');
  if (s.indexOf('84') === 0 && s.length === 11) s = '0' + s.slice(2);
  if (/^[1-9]\d{8}$/.test(s)) s = '0' + s;   // ô Sheet đã mất số 0 đầu
  return /^0\d{9}$/.test(s) ? s : '';
}
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
