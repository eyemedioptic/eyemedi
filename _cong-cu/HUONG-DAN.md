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
- Ảnh: chỉ dùng kho-anh hoặc ảnh sếp gửi; không lấy ảnh có bản quyền trên mạng.
- Tham khảo nguồn uy tín, viết lại hoàn toàn, ghi NGUON_THAM_KHAO.

## Sau khi sếp duyệt
1. Copy `xuat/<slug>.html` → gốc repo, `xuat/images/*` → `images/`.
2. `chuyen-muc.html`: "Bài viết nổi bật" giữ bài chính "Tiệm kính mắt gần đây" + 2 bài MỚI NHẤT bên cạnh; bài cũ bị đẩy ra chuyển lên đầu `#moi-nhat` ("Bài viết tiếp theo"); thêm thẻ bài vào nhóm đúng (`#bac-si`, `#kien-thuc`, `#kinh-mat`, `#lens`).
3. Gắn link vào từ 2–3 trang cũ (thêm 1 câu `<p>` tự nhiên trong thân bài).
4. `sitemap.xml`: thêm URL mới, lastmod = ngày đăng; cập nhật lastmod các trang đã sửa.
5. Cập nhật `_cong-cu/du-lieu/danh-sach-trang.csv` và lưu file .txt mới.
6. Commit (user Eyemedi / lensviethan@gmail.com), `git push origin HEAD:eyemedi.vn`, kiểm tra `git log -1 origin/eyemedi.vn`.
7. Search Console (tài khoản optic.eyemedi@gmail.com, property https://eyemedi.vn/): gửi lại sitemap.xml, yêu cầu lập chỉ mục URL mới (giới hạn ~10/ngày). Không tự nhập mật khẩu.
