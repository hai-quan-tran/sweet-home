# Thiết kế giao diện

Bản thiết kế (canvas): https://claude.ai/artifact/BUPSMC712gUDMSoLvunwo2

## Thiết bị
- Desktop, laptop, iPad (nhỏ nhất 9 inch). Ưu tiên desktop.

## Theme
- PrimeNG Aura, primary xanh dương, có light và dark mode.
- Dark mode có nút chuyển trên thanh trên cùng.

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
