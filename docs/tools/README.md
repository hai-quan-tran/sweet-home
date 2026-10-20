# Công cụ sinh tài liệu

Sinh bộ detail design (`docs/detail-design/*.xlsx`, mỗi màn/dialog 1 file, 4 sheet) từ app thật: chụp màn hình bằng
Playwright với dữ liệu mẫu, đánh số các mục lên ảnh, ghép với nội dung khai báo trong `content/design/*.mjs`.

## Cần có
- Node 22+; `npm install` trong thư mục này (dùng `playwright-core`, không tải trình duyệt).
- Chromium trong cache Playwright của máy: `%LOCALAPPDATA%/ms-playwright/chromium-1248` (đổi bằng biến `CHROME_PATH`).
- MySQL client (`mysql`, `mysqldump`): mặc định `C:/Program Files/MySQL/MySQL Server 8.0/bin` (đổi bằng `MYSQL_BIN`).
  Thông tin kết nối DB dev đọc từ `backend/src/main/resources/application-dev.yml`.
- Backend (cổng 8090) và frontend (cổng 4200) đang chạy — xem README gốc của dự án.

## Chạy
```bash
npm run all                          # chụp ảnh + vẽ sơ đồ + sinh toàn bộ file Excel
node capture.mjs --only=05,07        # chỉ chụp ảnh của một số file (lọc theo đầu tên file)
node diagrams.mjs --only=00          # chỉ vẽ lại sơ đồ Mermaid
node build-design.mjs --only=01      # chỉ sinh lại Excel (không cần server), dùng ảnh đã chụp trong out/
npm run restore                      # khôi phục DB nếu lần chụp trước bị dừng giữa chừng
```

## Cách hoạt động
1. `capture.mjs`: ghi cấu trúc DB ra `out/schema.json`; sao lưu DB dev (`out/baseline.sql`); tạo tài khoản Quản lý tạm
   `docs_quanly` (mật khẩu ngẫu nhiên) và dữ liệu mẫu qua API (`seed.mjs`: bảng giá, phòng, phụ thu, nhân viên, lịch làm,
   đơn ở mọi trạng thái, mốc giờ tính theo lúc chạy); chụp từng ảnh khai báo trong `shots`, vẽ khung + số đỏ lên phần tử
   theo `sel` của từng mục. Xong (kể cả khi lỗi) luôn khôi phục DB từ bản sao lưu và xoá ảnh phòng mẫu.
2. `diagrams.mjs`: vẽ `diagrams` (Mermaid) thành PNG độ phân giải x2 vào `out/diagrams/`.
3. `build-design.mjs`: sinh Excel 4 sheet — Thông tin · Màn hình · Chi tiết mục · Logic.

`out/` và `node_modules/` không đưa vào git.

## Nội dung một file (`content/design/NN_Ten.mjs`)
```js
export default {
  file: '05_LichDatPhong', title, kind, route, summary, access: [...], roles, related: [...], sources: [...],
  history: [{ version, date, author, content }],      // thêm dòng mới mỗi lần cập nhật
  shots: [{ id, caption, note?, role: 'manager'|'staff'|'newStaff'|'guest', fullPage?, viewport?, isolated?, clip?,
            go: async (page, ctx) => {...} }],   // viewport/isolated: chụp trong context riêng (iPad, dark mode);
                                                // clip: selector vùng cần cắt (vd chi tiết đơn, dialog)
  items: [{ shot?, sel, label, kind, code, dataType?, required?, rule?, default?, note?, badge?: 'left'|'right'|'bottom'|'inside' }],
  logic: [/* khối */], diagrams: { id: 'mermaid...' },
};
```
- Mục được đánh số theo thứ tự khai báo; cùng một số dùng cho ảnh (sheet 2) và bảng (sheet 3). `sel` là selector
  Playwright; để `null` nếu mục không thấy trên ảnh. Không tìm thấy phần tử thì capture báo lỗi.
- `ctx` (từ `seed.mjs`): `open(page, path)`, id phòng/đơn/phụ thu/tài khoản (`ctx.room['101']`, `ctx.order.staying`, ...).
- Khối nội dung: `{title}`, `{h}`, `{h2}`, `{p}`, `{note}`, `{list: [...], ordered?}`, `{kv: [[nhãn, giá trị]]}`,
  `{table: {cols: [{h, w}], rows}}` (w = số cột lưới, tổng ≤ 32), `{image: file}`, `{diagram: id}`, `{gap: n}`.
- `00_TongThe` thay sheet 2, 3 bằng `screen`, `detail` (bảng DB đọc từ `out/schema.json` + mô tả từng cột).
