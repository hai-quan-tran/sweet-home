# Màn hình & luồng

## Danh sách màn
| Màn | Nội dung chính |
|---|---|
| Đăng nhập | Tên đăng nhập, mật khẩu, ghi nhớ thiết bị |
| Tổng quan | Chỉ số trong ngày, tình trạng từng phòng, việc cần làm hôm nay, doanh thu 7 ngày |
| Lịch đặt phòng | Timeline phòng × giờ; bấm ô trống để tạo đơn; chi tiết đơn đang chọn |
| Đơn thuê | Danh sách lọc theo trạng thái (có tab "Chờ xác nhận") + chi tiết đơn |
| Tạo đơn thuê | Phòng & thời gian · Thông tin khách · Đặt cọc; giờ trả tự tính; báo phòng trống |
| Phòng & bảng giá | Thẻ phòng, bảng giá theo hạng, danh sách phụ thu |
| Thêm phòng | Thông tin · Ảnh · Giá thuê · Nhận & trả phòng |
| Nhân viên | Tài khoản, nhật ký thao tác, quyền của vai trò |
| Thêm nhân viên | Thông tin cá nhân · Tài khoản đăng nhập · Vai trò (không có ca làm) |
| Lịch làm | Lịch ca theo tuần, sửa ca, quản lý ca mẫu |

## Dialog
- **Sửa bảng giá**: mở từ màn Phòng.
- **Sửa phụ thu**: mở từ danh sách phụ thu. Nội dung đổi theo "Áp dụng khi":
  - Quá giờ trả phòng: ô phút ân hạn.
  - Vượt số khách tối đa: không có ô riêng (số khách tối đa cài ở từng phòng).
  - Ngày trong tuần: chọn T2–CN.
  - Khoảng ngày: danh sách dịp (tên, từ ngày, đến ngày).
  - Thêm tay vào đơn: không tự cộng, nhân viên chọn khi tạo/sửa đơn.
- **Gia hạn**: mở từ chi tiết đơn (màn Lịch / Đơn thuê).

## Luồng gia hạn
1. Bấm Gia hạn → dialog: chọn Thêm giờ / Thêm ngày, số lượng (bước 1 giờ hoặc 1 ngày).
2. Nếu mức gia hạn trùng đơn sau → cùng dialog hiện thêm phần "Chuyển sang phòng cùng giá".
3. Không có phòng phù hợp → không gia hạn được: nút Gia hạn bị khoá, dialog báo lý do và gợi ý "Đổi sang thêm giờ" nếu vẫn thêm giờ được (tối đa trước giờ nhận của đơn sau 1 tiếng).

## Luồng đơn khách tự check-in
Tạo đơn (nhập mã cửa riêng cho đơn) → đến giờ nhận tự chuyển "Đang ở" → đến giờ trả tự chuyển "Chờ xác nhận trả" → quản lý xác nhận, sửa giờ thực tế nếu cần.
