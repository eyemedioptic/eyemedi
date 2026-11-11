#!/usr/bin/env python3
"""Đăng bài SEO mới đã tạo bằng tao-trang.py vào repo eyemedi.vn.

Cách dùng (chạy từ gốc repo):
  python3 _cong-cu/dang_bai.py <ngay YYYY-MM-DD> <file cau-hinh.json>

cau-hinh.json:
{
  "noi_bat": ["slug-a", "slug-b"],          # 2 bài đưa lên khung "Bài viết nổi bật" (bỏ qua nếu có _cong-cu/du-lieu/noi-bat-co-dinh.txt)
  "bai": [
    {"slug": "...", "nhan": "Kính áp tròng", "nhom": "bac-si|lam-dep|kien-thuc|kinh-mat|lens|dich-vu|eyemedi",  # BẮT BUỘC: chuyên mục trên chuyen-muc
     "link_vao": {"slug-trang-cu": "Câu <a href=\"/slug.html\">chữ gắn link</a>."}}
  ]
}
Bài phải đã có ở _cong-cu/xuat/<slug>.html và ảnh ở _cong-cu/xuat/images/.
"""
import sys, json, re, html, shutil, csv, os, glob

ngay, cfgf = sys.argv[1], sys.argv[2]
cfg = json.load(open(cfgf, encoding="utf-8"))
X = "_cong-cu/xuat"
dmy = "/".join(reversed(ngay.split("-")))


def info(slug):
    h = open(f"{slug}.html", encoding="utf-8").read()
    h1 = re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", h, re.S).group(1)).strip()
    mo = re.search(r'<meta name="description" content="([^"]*)"', h).group(1)
    return h1, mo


def card(slug, nhan, d=ngay):
    h1, mo = info(slug)
    e = html.escape(h1, quote=True)
    return (f'<article class="tin"><a href="/{slug}.html"><img src="/images/{slug}.webp" alt="{e}" width="1200" height="630" loading="lazy"></a>\n'
            f'<div class="nd"><span class="nhan">{html.escape(nhan)}</span><h3><a href="/{slug}.html">{html.escape(h1)}</a></h3><p>{mo}</p>'
            f'<time datetime="{d}">{"/".join(reversed(d.split("-")))}</time></div></article>')


# 0. mỗi bài BẮT BUỘC có "nhom" (chuyên mục hiển thị trên chuyen-muc.html)
NHOM = ["bac-si", "lam-dep", "kien-thuc", "kinh-mat", "lens", "dich-vu", "eyemedi"]
for b in cfg["bai"]:
    if b.get("nhom") not in NHOM:
        sys.exit(f'Bài {b["slug"]}: thiếu/sai "nhom" – chọn 1 trong {NHOM}')

# 1. copy trang + ảnh
for b in cfg["bai"]:
    s = b["slug"]
    shutil.copy(f"{X}/{s}.html", f"{s}.html")
    for f in glob.glob(f"{X}/images/{s}*.webp"):
        shutil.copy(f, "images/")

# 2. chuyen-muc.html
c = open("chuyen-muc.html", encoding="utf-8").read()
moi_start = c.index('<section class="nhom"><h2>Bài viết nổi bật</h2>')
moi_end = c.index('<section id="moi-nhat"')
khung = c[moi_start:moi_end]
arts = re.findall(r'<article class="tin">.*?</article>', khung, re.S)
chinh, cu = arts[0], arts[1:]  # bài chính giữ nguyên
nhan = {b["slug"]: b["nhan"] for b in cfg["bai"]}
# Bài nổi bật CỐ ĐỊNH (nếu có file _cong-cu/du-lieu/noi-bat-co-dinh.txt): giữ nguyên 2 bài này, bài mới đều xuống "Bài viết tiếp theo"
pf = "_cong-cu/du-lieu/noi-bat-co-dinh.txt"
co_dinh = [l.strip() for l in open(pf, encoding="utf-8") if l.strip() and not l.startswith("#")] if os.path.exists(pf) else []
if co_dinh:
    the_cu = {re.search(r'href="/([^"]+)\.html"', a).group(1): a for a in re.findall(r'<article class="tin">.*?</article>', c, re.S)}
    moi_noi_bat = [the_cu[s] for s in co_dinh]
    day_xuong = [card(b["slug"], b["nhan"]) for b in cfg["bai"]] + [a for a in cu if not any(f'href="/{s}.html"' in a for s in co_dinh)]
else:
    moi_noi_bat = [card(s, nhan[s]) for s in cfg["noi_bat"]]
    day_xuong = [card(b["slug"], b["nhan"]) for b in cfg["bai"] if b["slug"] not in cfg["noi_bat"]] + cu
new_khung = khung
for a in cu:
    new_khung = new_khung.replace("\n" + a, "").replace(a, "")
new_khung = new_khung.replace(chinh, chinh + "\n" + "\n".join(moi_noi_bat), 1)
c = c[:moi_start] + new_khung + c[moi_end:]
k = '<section id="moi-nhat" class="nhom"><h2>Bài viết tiếp theo</h2><div class="luoi-tin">'
c = c.replace(k, k + "\n".join(day_xuong) + "\n", 1)
for b in cfg["bai"]:
    if b.get("nhom"):
        k = f'<section id="{b["nhom"]}" class="nhom"><h2>'
        i = c.index(k); j = c.index('<div class="luoi-tin">', i) + len('<div class="luoi-tin">')
        c = c[:j] + card(b["slug"], b["nhan"]) + "\n" + c[j:]
open("chuyen-muc.html", "w", encoding="utf-8").write(c)

# 3. link vào từ trang cũ (chèn sau đoạn <p> đầu tiên của H2 thứ 2 trong thân bài)
sua = {"chuyen-muc.html"}
for b in cfg["bai"]:
    for src, cau in b.get("link_vao", {}).items():
        f = f"{src}.html"
        h = open(f, encoding="utf-8").read()
        if f'/{b["slug"]}.html' in h:
            continue
        a = h.index('<main class="article">')
        ps = [m.start() for m in re.finditer(r"<h2", h[a:])]
        p = a + ps[min(1, len(ps) - 1)]
        k = h.index("</p>", p) + 4
        h = h[:k] + f"\n<p>{cau}</p>" + h[k:]
        open(f, "w", encoding="utf-8").write(h); sua.add(f)

# 4. sitemap
s = open("sitemap.xml", encoding="utf-8").read()
for b in cfg["bai"]:
    u = f'https://eyemedi.vn/{b["slug"]}.html'
    if f"<loc>{u}</loc>" not in s:
        s = s.replace("</urlset>", f"<url><loc>{u}</loc><lastmod>{ngay}</lastmod><priority>0.8</priority></url>\n</urlset>")
for f in sua:
    s = re.sub(r"(<loc>%s</loc><lastmod>)[^<]*" % re.escape("https://eyemedi.vn/" + f), r"\g<1>" + ngay, s)
open("sitemap.xml", "w", encoding="utf-8").write(s)

# 5. danh-sach-trang.csv
p = "_cong-cu/du-lieu/danh-sach-trang.csv"
rows = list(csv.reader(open(p, encoding="utf-8-sig")))
have = {r[0] for r in rows}
for b in cfg["bai"]:
    if b["slug"] in have:
        continue
    h1, mo = info(b["slug"])
    t = re.search(r"<title>(.*?)</title>", open(f'{b["slug"]}.html', encoding="utf-8").read()).group(1)
    rows.append([b["slug"], html.unescape(t), h1, b["nhan"], f'https://eyemedi.vn/{b["slug"]}.html', "có", str(len(mo)), str(len(b.get("link_vao", {}))), ""][:len(rows[0])])
csv.writer(open(p, "w", encoding="utf-8-sig", newline="")).writerows(rows)
print("Đã đăng:", [b["slug"] for b in cfg["bai"]], "| trang sửa:", sorted(sua))
