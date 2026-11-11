# Bộ công cụ tạo trang SEO eyemedi.vn

Thư mục `_cong-cu/` không được xuất ra web (GitHub Pages bỏ qua thư mục bắt đầu bằng `_`).

## Thành phần
- `trang-mau-seo.html` – trang mẫu (đã có: GA G-CG3CSN342E, ô thống kê CounterAPI, căn đều nội dung, slide "Thương hiệu liên kết", dòng "Theo nguồn tin từ internet", miễn trừ trách nhiệm, địa chỉ 63C Lạc Long Quân).
- `du-lieu/tao-trang.py` – máy tạo trang: `cd _cong-cu && python3 du-lieu/tao-trang.py . <slug>` → `xuat/<slug>.html` + `xuat/images/<slug>*.webp`. Tự đặt khung Thương hiệu liên kết vào giữa thân bài.
- `du-lieu/trang/<slug>.txt` – file dữ liệu từng trang (mẫu: xem `mat-bi-nhoe-mo-nguyen-nhan-do-dau-va-cach-dieu-tri.txt`, `giai-phap-cho-mat-khuyet-mong-mat-aniridia.txt`).
- `du-lieu/danh-sach-trang.csv`, `danh-sach-san-pham.csv` (mã sản phẩm hợp lệ), `doi-tac.csv`.
- `kho-anh/EYEMEDI-1..9.webp` + `mo-ta-anh.csv` – ảnh kho cửa hàng (ảnh duy nhất được phép dùng nếu sếp không gửi ảnh riêng).
- `them_slide.py`, `luot_tc.py`, `can_deu.py` – script đã dùng để sửa đồng loạt.

## Quy tắc
- Xưng hô: "Thưa sếp Trọng", tự xưng "Em Eyemedi". Trả lời ngắn gọn.
- KHÔNG đẩy lên web khi chưa được sếp trả lời "Duyệt". Luôn gửi bản xem trước HTML.
- Kiểm tra trùng với danh-sach-trang.csv (Jaccard tiêu đề ≥ 0,6 = trùng; 0,4–0,6 hỏi sếp; không trùng từ khóa chính).
- Bài 300–450 chữ, 3 phần H2, 3 FAQ, title 50–60 ký tự, mô tả 140–160 ký tự, 8 sản phẩm (trùng ≤4/8 với trang khác), 3 bài liên quan, 2–4 link trong bài, 2–3 trang cũ trỏ link vào.
- Không ghi năm (2026) vào tiêu đề. Bài y khoa: không hứa chữa khỏi, có câu "không thay thế chẩn đoán của bác sĩ chuyên khoa".
- Bài về bác sĩ/cơ sở: chỉ dùng thông tin công khai, không xếp hạng, không ưu tiên ai, không bịa thông tin.
- Ảnh: dùng ảnh miễn bản quyền từ Unsplash (Unsplash License, KHÔNG dùng ảnh Unsplash+/Getty), ảnh sếp gửi, hoặc kho-anh. Không dùng ảnh có bản quyền khác.
  Cách lấy ảnh Unsplash: WebFetch trang https://unsplash.com/s/photos/<tu-khoa> để lấy danh sách URL images.unsplash.com/photo-...; tải bằng curl `https://images.unsplash.com/photo-<id>?fm=jpg&q=80&w=1600&fit=crop` vào `_cong-cu/anh-rieng/<slug>-<n>.jpg`; khai báo trong file .txt bằng khối `ANH_RIENG:` (mỗi dòng `anh-rieng/<slug>-n.jpg | mô tả`), bỏ ANH_KHO/MO_TA_ANH. Ghi `NGUON_ANH:`.
- ẢNH ĐẠI DIỆN (ảnh slide 1 → images/<slug>.webp) KHÔNG ĐƯỢC TRÙNG với bất kỳ bài nào trên chuyen-muc.html. Kiểm tra bằng average-hash 16x16 (sai khác < 20 bit = trùng) trước khi gửi duyệt.
- Tham khảo nguồn uy tín, viết lại hoàn toàn, ghi NGUON_THAM_KHAO.

## Sau khi sếp duyệt
Có sẵn script: viết file cấu hình JSON (xem đầu `_cong-cu/dang_bai.py`) rồi chạy `python3 _cong-cu/dang_bai.py <YYYY-MM-DD> cau-hinh.json` từ gốc repo – script làm bước 1–5 bên dưới. Nên chạy thử trên bản sao repo để làm ảnh chụp xem trước trang Chuyên mục.
1. Copy `xuat/<slug>.html` → gốc repo, `xuat/images/*` → `images/`.
2. `chuyen-muc.html`: "Bài viết nổi bật" giữ bài chính "Tiệm kính mắt gần đây" + 2 bài MỚI NHẤT bên cạnh; bài cũ bị đẩy ra chuyển lên đầu `#moi-nhat` ("Bài viết tiếp theo"); thêm thẻ bài vào nhóm đúng (`#bac-si`, `#kien-thuc`, `#kinh-mat`, `#lens`).
3. Gắn link vào từ 2–3 trang cũ (thêm 1 câu `<p>` tự nhiên trong thân bài).
4. `sitemap.xml`: thêm URL mới, lastmod = ngày đăng; cập nhật lastmod các trang đã sửa.
5. Cập nhật `_cong-cu/du-lieu/danh-sach-trang.csv` và lưu file .txt mới.
6. Commit (user Eyemedi / lensviethan@gmail.com), `git push origin HEAD:eyemedi.vn`, kiểm tra `git log -1 origin/eyemedi.vn`.
7. Search Console (tài khoản optic.eyemedi@gmail.com, property https://eyemedi.vn/): gửi lại sitemap.xml, yêu cầu lập chỉ mục URL mới (giới hạn ~10/ngày). Không tự nhập mật khẩu.


## Bài viết nổi bật cố định (chuyen-muc.html)
- 2 ô cạnh bài chính trong khung "Bài viết nổi bật" được GHIM CỐ ĐỊNH theo `_cong-cu/du-lieu/noi-bat-co-dinh.txt` (sếp yêu cầu 11/11/2026): bac-si-phau-thuat-tham-my-quan-10-tphcm, toplist-bac-si-phong-kham-ung-buou-uy-tin-dieu-tri-hieu-qua-tphcm.
- `dang_bai.py` tự giữ nguyên 2 bài này; bài mới hằng ngày đều đưa vào đầu "Bài viết tiếp theo". Chỉ đổi khi sếp yêu cầu.
