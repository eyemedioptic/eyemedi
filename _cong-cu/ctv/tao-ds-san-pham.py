"""Xuất danh sách sản phẩm gọn (không ảnh) từ san-pham.html ra ctv/san-pham.json.
Chạy lại mỗi khi đổi giá/sản phẩm:  python _cong-cu/ctv/tao-ds-san-pham.py
Sau đó vào ctv/admin.html → "Đồng bộ giá" để cập nhật giá lên máy chủ."""
import json, os, re
goc = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
s = open(os.path.join(goc, 'san-pham.html'), encoding='utf8').read()
i = s.find('const PRODUCTS = ') + len('const PRODUCTS = ')
ds = json.JSONDecoder().raw_decode(s, i)[0]
ra = []
for p in ds:
    gia = int(p.get('price') or 0)
    bien = []
    for n in range(1, 7):
        ten = (p.get(f'variant{n}') or '').strip()
        if ten:
            bien.append({'name': ten, 'price': int(p.get(f'variant{n}Price') or 0) or gia})
    ra.append({'id': p['id'], 'name': p.get('name', ''), 'code': p.get('code', ''),
               'category': p.get('category', ''), 'price': gia, 'variants': bien})
open(os.path.join(goc, 'ctv', 'san-pham.json'), 'w', encoding='utf8').write(
    json.dumps(ra, ensure_ascii=False, separators=(',', ':')))
print('Đã xuất', len(ra), 'sản phẩm')
