# Hệ thống Cộng tác viên EYEMEDI – Hướng dẫn cài đặt

Trang CTV: https://eyemedi.vn/ctv/ · Trang quản trị: https://eyemedi.vn/ctv/admin.html

## Quy trình
1. CTV/KOL/KOC đăng ký bằng SĐT + mật khẩu → tài khoản được tạo ngay (trạng thái **Chờ duyệt**).
2. Admin bấm **Duyệt** → CTV ký hợp đồng online (điền CCCD, ký tay trên màn hình). Hợp đồng PDF + chữ ký lưu vào Google Drive.
3. Sau khi ký → CTV đặt **1 sản phẩm mẫu giá -50%** (chỉ 1 lần, giá lấy từ máy chủ nên CTV không sửa được).
4. Admin đổi đơn mẫu sang **Đã nhận** → CTV gửi link video → Admin **Duyệt** → mở hoa hồng, CTV nhận link `eyemedi.vn/san-pham.html?ref=MÃ`.
5. Khách bấm link (nhớ 30 ngày) và đặt hàng ở bất kỳ trang có giỏ hàng → đơn vẫn về Google Sheet đơn hàng cũ (thêm cột **Mã CTV**) và đồng thời ghi vào tab **DonHang** của Sheet CTV.
6. Admin đổi đơn sang **Đã giao** → hoa hồng được tính. Chuyển khoản xong tích **Đã trả HH**.

## Cài đặt máy chủ (1 lần, ~10 phút)
1. Tạo Google Sheet mới, tên "EYEMEDI - Cong tac vien".
2. **Tiện ích mở rộng → Apps Script**, xóa code mẫu, dán toàn bộ `_cong-cu/ctv/Code.gs`, bấm Lưu.
3. Chọn hàm **caiDat** → **Chạy** → cấp quyền (Sheet, Drive, kết nối ngoài).
4. **Triển khai → Tác vụ triển khai mới → Ứng dụng web**: Thực thi dưới dạng **Tôi**, Quyền truy cập **Bất kỳ ai** → Triển khai → chép URL `…/exec`.
5. Dán URL vào `ctv/config.js` (thay `DAN_URL_APPS_SCRIPT_VAO_DAY`) và đẩy lên GitHub.
6. Vào eyemedi.vn/ctv/ đăng ký bằng SĐT của anh. Trong Sheet tab **CTV**, dòng của anh: cột `is_admin` = `TRUE`, cột `status` = `active`.

Sửa Code.gs sau này: **Triển khai → Quản lý triển khai → bút chì → Phiên bản mới → Triển khai** (URL giữ nguyên).

## Thay đổi thường gặp
- % hoa hồng mặc định: `DEFAULT_RATE` trong Code.gs; % riêng từng CTV: sửa ở trang quản trị.
- Nội dung hợp đồng: hàm `contractHtml_` trong Code.gs (hiện là **bản nháp**, cần Giám đốc duyệt). Đổi nội dung thì tăng `CONTRACT_VERSION`.
- Đổi giá / thêm sản phẩm: chạy `python _cong-cu/ctv/tao-ds-san-pham.py` để cập nhật `ctv/san-pham.json` rồi đẩy lên (máy chủ dùng file này để tính giá mẫu, lưu đệm 10 phút).
- Trang mới phải có dòng `<script src="/ctv/ref.js" defer></script>` (đã thêm vào trang mẫu SEO) để nhận link `?ref=`.
- CTV quên mật khẩu: trang quản trị → **Cấp lại MK**.
