# Kế hoạch tài liệu: Detail design + Hướng dẫn sử dụng

Trạng thái: đã chốt với người dùng (16/10/2026). Đang làm GĐ 11 — xong 11.1 (20/10/2026).

## Context
App đã xong GĐ 0–10. Tài liệu hiện có chỉ là ghi chú kỹ thuật ngắn trong `.claude/architecture/` (viết cho người code).
Cần: (1) bộ detail design cho từng màn/dialog để người khác hiểu chính xác từng mục, tên trong code, logic;
(2) hướng dẫn sử dụng cho người dùng cuối (Quản lý, Nhân viên).

## Đã chốt với người dùng
- Thư mục `docs/` trong dự án, gồm `docs/detail-design/` và `docs/huong-dan/`; công cụ sinh tài liệu giữ ở `docs/tools/`.
- Detail design: **mỗi màn/dialog 1 file Excel**, 4 sheet:
  1. **Thông tin**: file là gì, màn/dialog nào, cách đi đến màn/dialog, vai trò dùng được, lịch sử cập nhật.
  2. **Màn hình**: ảnh chụp, đánh số các vùng, field, button (có thể nhiều ảnh cho nhiều trạng thái).
  3. **Chi tiết mục**: từng số → là gì, tên trong code, kiểu dữ liệu, định dạng/ràng buộc.
  4. **Logic**: chi tiết hoạt động (khởi tạo, từng hành động, API, quyền, đổi trạng thái, nhật ký, lỗi) + sơ đồ luồng.
- Thêm file **00_TongThe.xlsx** cùng mẫu 4 sheet: kiến trúc + ERD (sheet 2), bảng/cột DB (sheet 3), job nền, bảo mật,
  sơ đồ trạng thái đơn, danh sách API (sheet 4).
- Hướng dẫn sử dụng: **1 file Word + 1 file PDF**, một bộ chung, phần chỉ Quản lý gắn nhãn rõ; có ảnh chụp.
- Ảnh chụp bằng Playwright, dữ liệu mẫu tạo rồi xoá, DB dev về đúng baseline sau khi chụp.

## Cấu trúc
```
docs/
  detail-design/   00_TongThe.xlsx, 01_DangNhap.xlsx, ... 17_CaiDat.xlsx
  huong-dan/       HuongDanSuDung.docx, HuongDanSuDung.pdf
  tools/           package.json riêng (playwright, exceljs, docx, mermaid — version cố định), README chạy lại
    content/design/<màn>.mjs   nội dung 1 file Excel (thông tin, lịch sử, ảnh + danh sách mục, logic)
    content/guide.mjs          nội dung hướng dẫn (chương, bước, ảnh, cờ chỉ Quản lý)
    seed.mjs / cleanup.sql     tạo dữ liệu mẫu qua API / xoá về baseline
    capture.mjs                chụp ảnh, vẽ số đánh dấu lên phần tử theo selector của từng mục
    build-design.mjs           sinh .xlsx (exceljs, nhúng ảnh)
    build-guide.mjs            sinh .docx (docx), rồi Word trên máy (PowerShell COM) xuất .pdf
```
- Danh sách mục của mỗi màn khai báo **một lần** (số, selector, tên hiển thị, tên trong code, kiểu, định dạng) → dùng
  chung cho số trên ảnh (sheet 2) và bảng chi tiết (sheet 3), không lệch số.
- Sơ đồ Mermaid render thành PNG bằng Playwright + mermaid, nhúng vào sheet 4 / file Tổng thể.
- Ảnh trung gian và `node_modules` của tools đưa vào `.gitignore`; repo chỉ giữ script, nội dung và file xuất ra.
- Chromium dùng bản có sẵn trong cache Playwright; ảnh 1440px chế độ sáng.

## Danh sách file detail design
00 Tổng thể · 01 Đăng nhập · 02 Đổi mật khẩu · 03 Khung ứng dụng (menu, chuông thông báo, dark mode) · 04 Tổng quan ·
05 Lịch đặt phòng · 06 Đơn thuê (danh sách) · 07 Chi tiết đơn (nhận/trả phòng, thu tiền, huỷ, mã cửa, tin nhắn) ·
08 Tạo/Sửa đơn · 09 Dialog Gia hạn/Chuyển phòng · 10 Phòng & bảng giá · 11 Thêm/Sửa phòng · 12 Dialog Bảng giá ·
13 Dialog Phụ thu · 14 Nhân viên (tài khoản, nhật ký, quyền) · 15 Thêm/Sửa nhân viên · 16 Lịch làm · 17 Cài đặt.

## Nguồn nội dung (đọc code làm chuẩn)
- Màn: `frontend/src/app/pages/**` (`.ts`/`.html`: formControlName, validator, mặc định, điều kiện hiện nút),
  `app.routes.ts` (guard), `layout/shell.*`.
- API/quyền/lỗi: `backend/.../*Controller.java` (`@PreAuthorize`), request record (validation), chuỗi lỗi
  `BusinessException` trong `*Service.java`; nhật ký `activity/ActivityAction.java`; job `order/OrderStatusScheduler.java`.
- DB: `backend/src/main/resources/db/changelog/*.yaml`. Nghiệp vụ: `.claude/architecture/business-rules.md`, `screens.md`.

## GĐ 11: Detail design (mỗi phần xong → commit)
- [x] **11.1 Công cụ + Tổng thể**: `docs/tools` (seed, capture có đánh số, khôi phục DB, build-design, render Mermaid);
  sinh `00_TongThe.xlsx`. Chạy thử trọn quy trình trên 01_DangNhap để chốt mẫu trình bày.
  Khác kế hoạch: không dùng `cleanup.sql` viết tay — sao lưu cả DB bằng `mysqldump` trước khi tạo dữ liệu rồi khôi phục
  (đúng baseline tuyệt đối, kể cả AUTO_INCREMENT); tài khoản Quản lý tạm `docs_quanly` tạo thẳng trong DB vì không biết
  mật khẩu `admin`.
- [ ] **11.2** 01–04 (Đăng nhập, Đổi mật khẩu, Khung ứng dụng, Tổng quan).
- [ ] **11.3** 05–09 (Lịch, Đơn thuê, Chi tiết đơn, Tạo/Sửa đơn, Gia hạn) + sơ đồ luồng tạo đơn, nhận–trả phòng, gia hạn.
- [ ] **11.4** 10–13 (Phòng, Thêm/Sửa phòng, Bảng giá, Phụ thu).
- [ ] **11.5** 14–17 (Nhân viên, Thêm/Sửa nhân viên, Lịch làm, Cài đặt).

## GĐ 12: Hướng dẫn sử dụng (mỗi phần xong → commit)
Ngôn ngữ nghiệp vụ, mỗi việc = các bước đánh số + ảnh; phần "Chỉ Quản lý" đánh dấu.
- **12.1** `build-guide` (docx → pdf qua Word) + chương Bắt đầu & công việc hằng ngày: đăng nhập / đổi mật khẩu /
  bị khoá tạm, giao diện chung & chuông, Tổng quan, tạo đơn & gửi tin nhắn, nhận phòng (nhắc Chờ dọn), trả phòng & thu
  tiền, gia hạn / chuyển phòng, huỷ đơn, Lịch đặt phòng, đánh dấu Đã dọn, xem Lịch làm.
- **12.2** Phần Quản lý & hỏi đáp: phòng, bảng giá, phụ thu, nhân viên & nhật ký, sửa ca / ca mẫu, mẫu tin nhắn,
  thông tin homestay, xác nhận trả phòng đơn tự check-in; hỏi đáp (quên mật khẩu, bị khoá, không gia hạn được...).

## Sau mỗi giai đoạn
- Cập nhật `.claude/todo/code-plan.md`, `todo.md` (thêm GĐ 11, 12); `.claude/architecture/project-structure.md`
  ghi mục `docs/` và cách chạy lại công cụ.
- Commit message ghi rõ phần tài liệu nào; không push khi chưa xác nhận.
- Lưu ý: `docs/tools` là công cụ sinh tài liệu, kiểm tra bằng chạy thật + đọc lại file xuất, không viết unit test.

## Kiểm tra
- Mỗi file Excel: đọc lại bằng exceljs (đủ 4 sheet, có ảnh), mở thử bằng Excel; số trên ảnh khớp sheet 3.
- Đối chiếu tên trong code, thông báo lỗi, quyền với code (grep) — không mục nào thiếu căn cứ trong code.
- Word mở được, PDF xuất thành công; xem lại các trang PDF (ảnh rõ, mục lục đúng, nhãn Chỉ Quản lý đúng chỗ).
- Ảnh không chứa dữ liệu thật/mật khẩu; sau khi chụp DB dev đúng baseline (admin, 3 ca mẫu, cài đặt giá
  22:00/13:00/15:00/13:00), server tạm đã tắt.
