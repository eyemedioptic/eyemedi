# Hệ thống Cộng tác viên EYEMEDI – Hướng dẫn cài đặt

Trang CTV: https://eyemedi.vn/ctv/ · Trang quản trị: https://eyemedi.vn/ctv/admin.html

## Quy trình
1. CTV/KOL/KOC đăng ký bằng SĐT + mật khẩu → tài khoản được tạo ngay (trạng thái **Chờ duyệt**).
2. Admin bấm **Duyệt** → CTV ký hợp đồng online (điền CCCD, ký tay trên màn hình). Hợp đồng PDF + chữ ký lưu vào Google Drive.
3. Sau khi ký → CTV chọn **1 sản phẩm mẫu trong các sản phẩm ở trang chủ** giá -50% (chỉ 1 lần, giá lấy từ máy chủ nên CTV không sửa được).
4. Admin đổi đơn mẫu sang **Đã nhận** → CTV gửi link video → Admin **Duyệt** → mở hoa hồng, CTV nhận link `eyemedi.vn/san-pham.html?ref=MÃ`.
5. Khách bấm link (nhớ 30 ngày) và đặt hàng ở bất kỳ trang có giỏ hàng → đơn vẫn về Google Sheet đơn hàng cũ (thêm cột **Mã CTV**) và đồng thời ghi vào tab **DonHang** của Sheet CTV.
6. Admin đổi đơn sang **Đã giao** → hoa hồng được tính theo bậc doanh thu tháng. Chuyển khoản xong tích **Đã trả HH**.

## Cài đặt máy chủ (1 lần, ~10 phút)
1. Tạo Google Sheet mới, tên "EYEMEDI - Cong tac vien".
2. **Tiện ích mở rộng → Apps Script**, xóa code mẫu, dán toàn bộ `_cong-cu/ctv/Code.gs`, bấm Lưu.
3. Chọn hàm **caiDat** → **Chạy** → cấp quyền (Sheet, Drive, kết nối ngoài).
   Sau đó chọn hàm **capQuyenGuiMail** → **Chạy** → cấp quyền gửi email (cho nút "Quên mật khẩu"; sẽ có 1 email thử gửi về tài khoản Google của anh).
4. **Triển khai → Tác vụ triển khai mới → Ứng dụng web**: Thực thi dưới dạng **Tôi**, Quyền truy cập **Bất kỳ ai** → Triển khai → chép URL `…/exec`.
5. Dán URL vào `ctv/config.js` (thay `DAN_URL_APPS_SCRIPT_VAO_DAY`) và đẩy lên GitHub.
6. Vào eyemedi.vn/ctv/ đăng ký bằng SĐT của anh. Trong Sheet tab **CTV**, dòng của anh: cột `is_admin` = `TRUE`, cột `status` = `active`.

Sửa Code.gs sau này: **Triển khai → Quản lý triển khai → bút chì → Phiên bản mới → Triển khai** (URL giữ nguyên).

## Thay đổi thường gặp
- Bậc hoa hồng theo doanh thu tháng: bảng `TIERS` trong Code.gs (10% → 35%). Doanh thu tháng = tổng đơn **đã giao** trong tháng; bậc đạt được áp dụng cho mọi đơn chưa trả trong tháng đó và tự tính lại khi đổi trạng thái đơn.
- % cố định riêng cho 1 CTV: nhập số ở cột "% HH riêng" trong trang quản trị; để trống = theo bậc.
- Hợp đồng (1 mặt A4): hàm `contractHtml_` trong Code.gs. Thông tin Bên A (hộ kinh doanh, MST, người đại diện) nằm trong `BEN_A`. Đổi nội dung thì tăng `CONTRACT_VERSION`.
- Thuế TNCN: hợp đồng ghi CTV tự kê khai, nộp; nhưng theo TT 111/2013 bên trả có thể phải khấu trừ 10% khi chi từ 2 triệu/lần cho cá nhân không có HĐLĐ. Hỏi kế toán trước khi chi trả lần đầu.
- Danh sách sản phẩm mẫu = các sản phẩm trên **trang chủ** (index.html). Đổi giá / thêm sản phẩm trên trang chủ: chạy `python _cong-cu/ctv/tao-ds-san-pham.py` để cập nhật `ctv/san-pham.json` rồi đẩy lên (máy chủ dùng file này để tính giá mẫu, lưu đệm 10 phút).
- Trang mới phải có dòng `<script src="/ctv/ref.js" defer></script>` (đã thêm vào trang mẫu SEO) để nhận link `?ref=`.
- CTV quên mật khẩu: trang quản trị → **Cấp lại MK**.

## Phần mềm bán hàng (eyemedi.vn/app)
Phần mềm bán hàng dùng chung máy chủ Apps Script và Google Sheet với trang CTV. Phần mã cho phần mềm nằm ở cuối `Code.gs` (mục "PHẦN MỀM BÁN HÀNG"). Các tab `NhanVien`, `PhienNV`, `PosData`, `PosDon`, `PosKho` tự tạo khi dùng lần đầu.

Cập nhật máy chủ (mỗi khi Code.gs đổi):
1. Mở Google Sheet "EYEMEDI - Cong tac vien" → **Tiện ích mở rộng → Apps Script**.
2. Xóa toàn bộ code cũ trong Code.gs, dán toàn bộ `_cong-cu/ctv/Code.gs` mới, bấm **Lưu**.
3. **Triển khai → Quản lý triển khai → bút chì → Phiên bản: Phiên bản mới → Triển khai**. URL giữ nguyên, không cần sửa `ctv/config.js`.

Khi máy chủ chưa cập nhật, phần mềm vẫn mở được nhưng chạy chế độ một máy (dữ liệu lưu trên trình duyệt) và hiện dòng cảnh báo trên khung thông báo.

Tài khoản:
- Admin đầu tiên: đăng nhập eyemedi.vn/app bằng SĐT và mật khẩu của tài khoản quản trị trang CTV → tự có tài khoản Admin bán hàng.
- Nhân viên bấm **Đăng ký nhân viên** ở màn hình đăng nhập → Admin vào mục **Nhân viên** để duyệt, chọn vai trò, bật tắt từng quyền, khóa, mở khóa, cấp lại mật khẩu hoặc xóa.
- Vai trò: Admin (toàn quyền), Quản lý, Nhân viên bán hàng, Nhân viên kho. Quyền chi tiết: bán hàng, xem đơn mọi nhân viên, xử lý đơn, sản phẩm, kho, khách hàng, báo cáo, quản lý nhân viên.
- Nhân viên không có quyền "Xem đơn của mọi nhân viên" chỉ thấy đơn do mình tạo.
- Chi nhánh: mặc định có 5 chi nhánh của EYEMEDI, sửa hoặc thêm ở mục **Nhân viên → Chi nhánh** (chi nhánh có thể là cửa hàng hoặc kho riêng). Mỗi chi nhánh có tồn kho riêng; đơn, phiếu kho, phiếu quỹ gắn chi nhánh đang chọn ở khung trên cùng. Chuyển hàng giữa chi nhánh bằng **Kho hàng → Chuyển kho**.
- Quyền Admin: chỉ tài khoản vai trò **Admin** được tạo/sửa chi nhánh, tạo nhân viên (**Nhân viên → + Tạo nhân viên**), duyệt, cấp quyền, khóa, xóa, cấp lại mật khẩu. Vai trò khác không được cấp quyền này dù chọn trong danh sách.
- Tài khoản Admin khai báo sẵn: dán tệp riêng `TaiKhoanAdmin.gs` (Claude gửi riêng, chỉ chứa mã băm mật khẩu, không đưa lên GitHub) vào Apps Script cạnh Code.gs rồi triển khai lại; lần đăng nhập đầu đúng mật khẩu sẽ tự tạo tài khoản trong tab NhanVien.
- Sản phẩm: bấm **Sản phẩm → Lấy sản phẩm từ web** để nạp toàn bộ sản phẩm đang bán trên eyemedi.vn với giá hiện tại (mỗi màu một mã riêng). Bấm lại bất cứ lúc nào để cập nhật giá theo web; giá vốn và tồn kho không bị đổi. Tròng kính được gắn nhãn “Chờ bảng giá” cho đến khi sửa giá; giá đã sửa sẽ không bị ghi đè.
- Nhân viên chỉ làm việc ở các chi nhánh được phân công; Admin, Quản lý (quyền "Làm việc ở mọi chi nhánh") xem được tất cả và chọn "Tất cả chi nhánh" để xem tổng.
- Tồn kho cũ (trước khi có chi nhánh) được tính vào chi nhánh đầu tiên.
