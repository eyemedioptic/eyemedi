"""Tạo trang SEO EYEMEDI từ file dữ liệu .txt + trang mẫu.
Cách dùng: python tao-trang.py <thu_muc_goc> <slug> [thu_muc_xuat]
  thu_muc_goc: thư mục "Dang bai Eyemedi" (có trang-mau-seo.html, du-lieu/, kho-anh/)
"""
import csv, html, json, random, re, sys
from pathlib import Path

goc = Path(sys.argv[1]); slug = sys.argv[2]
xuat = Path(sys.argv[3]) if len(sys.argv) > 3 else goc / "xuat"
xuat.mkdir(parents=True, exist_ok=True)

# 1. Đọc file dữ liệu
raw = (goc / "du-lieu" / "trang" / f"{slug}.txt").read_text(encoding="utf-8")
d = {m.group(1): m.group(2).strip() for m in
     re.finditer(r"^([A-Z0-9_]+):[ \t]*(.*?)(?=^[A-Z0-9_]+:(?:[ \t]|$)|\Z)", raw, re.S | re.M)}

trang = {r["slug"]: r for r in csv.DictReader(open(goc / "du-lieu" / "danh-sach-trang.csv", encoding="utf-8-sig"))}
sp = {r["ma_id"]: r for r in csv.DictReader(open(goc / "du-lieu" / "danh-sach-san-pham.csv", encoding="utf-8-sig"))}

def ten_trang(s):
    r = trang.get(s, {})
    t = r.get("h1") or r.get("tieu_de_title") or s
    return re.sub(r"^[^\wÀ-ỹ]+", "", html.unescape(t)).strip()

def gia(v):
    try: return f"{int(float(v)):,}".replace(",", ".") + "đ"
    except: return "Liên hệ"

v = dict(d)
# Thân bài: ghép mọi cặp H2_n / NOI_DUNG_n (n = 1, 2, 3, ...)
so = sorted({int(k[3:]) for k in d if re.fullmatch(r"H2_\d+", k)})
v["THAN_BAI"] = "\n\n  ".join(f'<h2>{html.escape(d[f"H2_{n}"])}</h2>\n  {d.get(f"NOI_DUNG_{n}", "")}' for n in so)
v.setdefault("NGAY_CAP_NHAT", d["NGAY_DANG"])
if not v.get("TITLE"): v["TITLE"] = f'{d["TIEU_DE"]} | EYEMEDI'
v["NGAY_DANG_VN"] = "/".join(reversed(d["NGAY_DANG"].split("-")))
v["NGAY_CAP_NHAT_VN"] = "/".join(reversed(v["NGAY_CAP_NHAT"].split("-")))
for i, ma in enumerate([x.strip() for x in d["SAN_PHAM"].split(",")][:8], 1):
    p = sp[ma]
    v[f"SP_{i}_TEN"], v[f"SP_{i}_LINK"], v[f"SP_{i}_ANH"], v[f"SP_{i}_GIA"] = p["ten_san_pham"], p["link"], p["anh"] or "https://eyemedi.vn/images/logo-eyemedi.png", gia(p["gia"])
# LIEN_QUAN: "slug | chữ hiển thị; slug | chữ hiển thị; ..." (không ghi chữ thì lấy tiêu đề trang)
_lq = d["LIEN_QUAN"]
for i, s in enumerate([x.strip() for x in (_lq.split(";") if ";" in _lq else _lq.split(","))][:3], 1):
    sl, _, chu = (p.strip() for p in s.partition("|"))
    v[f"SLUG_LIEN_QUAN_{i}"], v[f"TIEU_DE_LIEN_QUAN_{i}"] = sl, chu or ten_trang(sl)

# 2. Ảnh: chọn ngẫu nhiên 5 ảnh từ kho, đổi tên theo slug
kho = sorted(p for p in (goc / "kho-anh").glob("EYEMEDI-*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))
# Trang cũ: dùng ảnh riêng của trang (ANH_RIENG: mỗi dòng "đường dẫn ảnh | mô tả")
anh_rieng = [x.split("|", 1) for x in d.get("ANH_RIENG", "").splitlines() if "|" in x]
if anh_rieng:
    kho = [Path(a.strip()) if Path(a.strip()).is_absolute() else goc / a.strip() for a, _ in anh_rieng][:5]
    for i, (_, mt) in enumerate(anh_rieng[:5], 1):
        v[f"MO_TA_ANH_{i}"] = mt.strip()
anh_dung = []
so_chon = re.findall(r"\d+", d.get("ANH_KHO", "").split("(")[0])
if so_chon:  # ảnh chỉ định trong file .txt
    kho = [p for p in kho if re.sub(r"\D", "", p.stem) in so_chon]
if not kho:
    sys.exit("Kho ảnh trống – dừng.")
if True:
    from PIL import Image, ImageOps
    (xuat / "images").mkdir(exist_ok=True)
    chon = kho if anh_rieng else random.sample(kho, min(5, len(kho)))
    for i, p in enumerate(chon, 1):
        im = ImageOps.fit(Image.open(p).convert("RGB"), (1200, 800))
        im.save(xuat / "images" / f"{slug}-{i}.webp", "WEBP", quality=82)
        if i == 1:
            ImageOps.fit(Image.open(p).convert("RGB"), (1200, 630)).save(xuat / "images" / f"{slug}.webp", "WEBP", quality=82)
    anh_dung = [p.stem for p in chon]
    # Mô tả ảnh lấy theo đúng ảnh được chọn (kho-anh/mo-ta-anh.csv)
    mt = goc / "kho-anh" / "mo-ta-anh.csv"
    if mt.exists() and not anh_rieng:
        mo_ta = {r["ten_anh"]: r["mo_ta"] for r in csv.DictReader(open(mt, encoding="utf-8-sig"))}
        for i, ten in enumerate(anh_dung, 1):
            if ten in mo_ta:
                v[f"MO_TA_ANH_{i}"] = f'{mo_ta[ten]} – {d["TU_KHOA_CHINH"]}'[:125]

# 3. Đổ vào trang mẫu
mau = (goc / "trang-mau-seo.html").read_text(encoding="utf-8")
mau = re.sub(r"<!--\s*=+\s*TRANG MẪU SEO.*?-->\n", "", mau, flags=re.S)
# Kho ít hơn 5 ảnh → bỏ slide và ImageObject thừa
for i in range(len(anh_dung) + 1, 6):
    mau = re.sub(rf'\s*<figure class="slide"><img src="images/\{{\{{SLUG\}}\}}-{i}\.webp".*?</figure>', "", mau, flags=re.S)
    mau = re.sub(rf',\s*\{{"@type":"ImageObject","contentUrl":"https://eyemedi.vn/images/\{{\{{SLUG\}}\}}-{i}\.webp".*?"height":800\}}', "", mau)

# Khung "Thương hiệu liên kết": chuyển vào giữa thân bài (trước H2 ở giữa)
_m = re.search(r'\n\s*<section class="th-khung".*?</section>', mau, flags=re.S)
if _m:
    mau = mau.replace(_m.group(0), "")
    _p = v["THAN_BAI"].split("\n\n  ")
    _p.insert(len(_p)//2 if len(_p) > 1 else len(_p), _m.group(0).strip())
    v["THAN_BAI"] = "\n\n  ".join(_p)

def thay(m):
    k = m.group(1)
    if k not in v: return m.group(0)
    val = v[k]
    return val if k.startswith("NOI_DUNG") or k == "THAN_BAI" else html.escape(val, quote=True)

def thay_json(m):  # trong Schema: escape kiểu JSON
    k = m.group(1)
    return json.dumps(re.sub("<[^>]+>", "", v[k]), ensure_ascii=False)[1:-1] if k in v else m.group(0)

dau, ld, cuoi = re.split(r'(<script type="application/ld\+json">.*?</script>)', mau, maxsplit=1, flags=re.S)
ld = re.sub(r"\{\{([A-Z0-9_]+)\}\}", thay_json, ld)
out = re.sub(r"\{\{([A-Z0-9_]+)\}\}", thay, dau) + ld + re.sub(r"\{\{([A-Z0-9_]+)\}\}", thay, cuoi)
# Ảnh đã đưa lên slide thì bỏ khỏi thân bài (tránh lặp ảnh)
for a_, _ in anh_rieng:
    out = re.sub(r'\s*<figure><img src="/?' + re.escape(a_.strip()) + r'"[^>]*></figure>', "", out)

# Form gửi về Google Sheet (tùy trang): FORM_URL, FORM_TIEU_DE, FORM_TRUONG (mỗi dòng "tên | gợi ý | kiểu"), FORM_NUT, FORM_CAM_ON, FORM_GHI_CHU
if d.get("FORM_URL"):
    truong = ""
    for ln in d.get("FORM_TRUONG", "").splitlines():
        p = [x.strip() for x in ln.split("|")]
        if len(p) >= 2:
            kieu = p[2] if len(p) > 2 and p[2] else "text"
            dd = ' onfocus="window.fbq&&fbq(\'track\',\'InitiateCheckout\')"' if kieu == "tel" else ""
            truong += f'<input type="{kieu}" name="{html.escape(p[0])}" placeholder="{html.escape(p[1])}" required{dd}>\n'
    form = f"""<section class="form-box" id="dat-lich">
  <h2>{html.escape(d.get("FORM_TIEU_DE", "Đặt lịch đo mắt"))}</h2>
  <form id="eyForm">
{truong}  <p class="ghi-chu">{html.escape(d.get("FORM_GHI_CHU", ""))}</p>
  <button type="submit" id="eyBtn">{html.escape(d.get("FORM_NUT", "GỬI ĐĂNG KÝ"))}</button>
  </form>
  <p class="ok" id="eyOk">{html.escape(d.get("FORM_CAM_ON", "Gửi thành công! EYEMEDI sẽ liên hệ bạn sớm."))}</p>
</section>
<script>
(function(){{var f=document.getElementById('eyForm'),b=document.getElementById('eyBtn'),ok=document.getElementById('eyOk'),t=b.textContent;
 f.addEventListener('submit',function(e){{e.preventDefault();b.disabled=true;b.textContent='Đang gửi...';
  if(window.fbq)fbq('track','Lead');
  fetch('{d["FORM_URL"].strip()}',{{method:'POST',mode:'no-cors',body:new FormData(f)}})
  .then(function(){{ok.style.display='block';f.reset();b.disabled=false;b.textContent=t;}})
  .catch(function(){{b.disabled=false;b.textContent='THỬ LẠI';}});}});}})();
</script>
"""
    out = out.replace('  <section class="faq">', form + '  <section class="faq">', 1)

# Meta Pixel (tùy trang): PIXEL: <id>
if d.get("PIXEL", "").strip():
    pid = d["PIXEL"].strip()
    px = f"""<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','{pid}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id={pid}&amp;ev=PageView&amp;noscript=1"></noscript>
"""
    out = out.replace("</head>", px + "</head>", 1)

# Dòng miễn trừ y khoa: chỉ giữ khi Y_KHOA: có
if d.get("Y_KHOA", "").strip().lower() not in ("có", "co", "yes"):
    out = re.sub(r'\s*<p class="disclaimer">.*?</p>', "", out, flags=re.S)

# Trang danh mục chưa có → hiện chữ, không gắn link (tránh link 404)
dm = d["SLUG_DANH_MUC"]
if dm not in trang:
    out = out.replace(f'<a href="/{dm}.html">{html.escape(d["DANH_MUC"])}</a>', f'<span>{html.escape(d["DANH_MUC"])}</span>')
    out = out.replace(f',"item":"https://eyemedi.vn/{dm}.html"', "")

# Kiểm tra link nội bộ
co = set(trang) | {slug}
hong = sorted({l for l in re.findall(r'href="/([a-z0-9.-]+?)\.html"', out) if l not in co})

(xuat / f"{slug}.html").write_text(out, encoding="utf-8")
print("Link nội bộ hỏng:", hong or "không")

con = re.findall(r"\{\{[A-Z0-9_]+\}\}", out)
print("OK", xuat / f"{slug}.html", "| ảnh kho:", anh_dung or "CHƯA CÓ", "| ô chưa điền:", con)
