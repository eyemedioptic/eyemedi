<?php
/**
 * EYEMEDI - endpoint lưu danh sách sản phẩm trực tiếp vào file HTML.
 * Cài cùng thư mục với website. Đổi mật khẩu bên dưới trước khi sử dụng.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// 1) BẮT BUỘC đổi chuỗi này thành mật khẩu riêng, dài và khó đoán.
$SAVE_KEY = 'Eyemedi123!@#';

// 2) Tên file HTML trang chủ trên hosting. Nếu website dùng tên khác, sửa dòng này.
$TARGET_FILE = __DIR__ . '/index.html';

function reply($status, $message, $extra = []) {
    http_response_code($status);
    echo json_encode(array_merge(['ok' => $status >= 200 && $status < 300, 'message' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(405, 'Chỉ chấp nhận yêu cầu POST.');
}

$provided = $_SERVER['HTTP_X_EYEMEDI_KEY'] ?? '';
if (!is_string($provided) || !hash_equals($SAVE_KEY, $provided)) {
    reply(403, 'Mật khẩu lưu hosting không đúng.');
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') reply(400, 'Không nhận được dữ liệu sản phẩm.');
$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['products']) || !is_array($data['products'])) {
    reply(400, 'Dữ liệu gửi lên không đúng định dạng.');
}
if (count($data['products']) > 100) reply(400, 'Số lượng sản phẩm vượt giới hạn cho phép.');

if (!is_file($TARGET_FILE) || !is_readable($TARGET_FILE)) {
    reply(500, 'Không tìm thấy file HTML đích hoặc hosting không cho phép đọc file. Hãy kiểm tra TARGET_FILE trong PHP.');
}
if (!is_writable($TARGET_FILE) || !is_writable(dirname($TARGET_FILE))) {
    reply(500, 'Hosting chưa cấp quyền ghi cho file HTML hoặc thư mục chứa file.');
}

$html = file_get_contents($TARGET_FILE);
if ($html === false) reply(500, 'Không đọc được file HTML hiện tại.');
$productsJson = json_encode($data['products'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($productsJson === false) reply(400, 'Không thể mã hóa dữ liệu sản phẩm.');

$pattern = '/const\s+PRODUCTS\s*=\s*\[.*?\];/s';
$replacement = 'const PRODUCTS = ' . $productsJson . ';';
$newHtml = preg_replace($pattern, $replacement, $html, 1, $replacements);
if ($newHtml === null || $replacements !== 1) {
    reply(500, 'Không tìm thấy vùng dữ liệu PRODUCTS trong file HTML. Hãy dùng đúng file landing page EYEMEDI tương thích.');
}

// Ghi file tạm rồi thay thế để tránh làm hỏng HTML nếu tiến trình bị gián đoạn.
$dir = dirname($TARGET_FILE);
$tmp = tempnam($dir, '.eyemedi-save-');
if ($tmp === false) reply(500, 'Không tạo được file tạm. Kiểm tra quyền ghi thư mục.');
if (file_put_contents($tmp, $newHtml, LOCK_EX) === false) {
    @unlink($tmp);
    reply(500, 'Không ghi được file tạm. Kiểm tra dung lượng và quyền hosting.');
}
@chmod($tmp, fileperms($TARGET_FILE) & 0777);
if (!rename($tmp, $TARGET_FILE)) {
    @unlink($tmp);
    reply(500, 'Không thể cập nhật file HTML. Hosting có thể chặn thao tác thay thế file.');
}

reply(200, 'Đã cập nhật file HTML trên hosting.', ['file' => basename($TARGET_FILE)]);
