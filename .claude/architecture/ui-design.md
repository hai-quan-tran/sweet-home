# Thiết kế giao diện

Bản thiết kế: các file HTML thuần trong thư mục `design/` (mở `design/index.html` bằng trình duyệt).
- **Không dùng canvas** (claude.ai artifact): máy không kết nối được, không mở/sửa được.
- Xem: mở `design/index.html`, chọn màn, chọn Sáng/Tối và khung xem (Desktop 1440, Laptop 1280, iPad 9.7" dọc 768 / ngang 1024).
- Sửa thiết kế: sửa trực tiếp file trong `design/`, thêm màn mới thì thêm link vào `design/index.html`.
- Dark mode dùng chung: `design/theme.css` (biến màu tối) + `design/theme.js` (nút chuyển, nhớ lựa chọn, nhận `?theme=dark`). Màn mới nạp 2 file này ở cuối `<body>` và gắn `data-theme-toggle` cho nút mặt trăng.

## Thiết bị
- Desktop, laptop, iPad (nhỏ nhất 9 inch). Ưu tiên desktop.
- Mốc responsive: ≤ 1366px (laptop) thu hẹp cột phải / giảm số cột lưới · ≤ 1100px (iPad) menu thành cột icon, form 2 cột · ≤ 860px cột tóm tắt xuống dưới.
- Bảng rộng (Đơn thuê) trên iPad: không xuống dòng, cuộn ngang trong card.

## Theme
- PrimeNG Aura, primary xanh dương, có light và dark mode.
- Font Be Vietnam Pro. Nút chính dùng blue-600 (#2563eb), hover blue-700 (light mode).
- Dark mode có nút chuyển trên thanh trên cùng (màn Đăng nhập: góc trên phải).

## Layout chung
- Menu dọc bên trái: Tổng quan · Lịch đặt phòng · Đơn thuê · Phòng & bảng giá · Nhân viên · Lịch làm. Cuối menu: tài khoản đang đăng nhập + Đăng xuất.
- iPad (≤ 1100px): menu thu thành cột icon.
- Thanh trên cùng: nút dark mode, thông báo, nút "Tạo đơn thuê".
- **Không có ô tìm kiếm toàn cục** trên thanh trên cùng. Chỉ tìm kiếm trong màn Đơn thuê.
- Trang: tiêu đề + mô tả ngắn, nội dung chia thành card.
- Form dài: chia thành các bước đánh số, cột phải là tóm tắt / xem trước và nút lưu.

## Component dùng chung
- Tag trạng thái đơn: Đã đặt · Đang ở · Quá giờ · Chờ xác nhận trả · Đã trả · Đã huỷ. Trạng thái phòng thêm: Trống · Chờ dọn.
- Nhãn hình thức check-in: "Khách tự check-in" (icon chìa khoá) / "Nhân viên check-in" (icon người).
- Dữ liệu nhạy cảm (CCCD, mã cửa) che mặc định, chỉ hiện 4 số cuối hoặc bấm mới hiện.
- Sửa nhanh dùng dialog phủ lên màn hiện tại: Sửa bảng giá, Sửa phụ thu, Gia hạn.
- Bản vẽ là góc nhìn Quản lý. Vai trò Nhân viên: ẩn các nút Thêm phòng, Sửa phòng, Sửa bảng giá, Thêm/Sửa phụ thu,
  Thêm nhân viên, Sao chép tuần trước, sửa ca và quản lý ca mẫu; mục Lịch làm chỉ xem.
