# Việc cần làm

## Thiết kế giao diện
- [x] Đăng nhập, Tổng quan, Lịch đặt phòng, Đơn thuê, Tạo đơn thuê, Phòng & bảng giá
- [x] Thêm phòng, Nhân viên, Thêm nhân viên, Lịch làm
- [x] Dialog: Sửa bảng giá, Sửa phụ thu, Gia hạn (bước 1 + bước 2 chuyển phòng)
- [x] Hình thức check-in theo phòng/đơn, trạng thái "Chờ xác nhận trả"
- [x] Bỏ ô tìm kiếm toàn cục
- [x] Dark mode + iPad cho các màn còn lại (dark mode dùng chung theme.css/theme.js; index có khung iPad/laptop)
- [x] Dialog phụ thu: đủ 5 trường hợp "Áp dụng khi" (bấm để đổi nội dung)
- [x] Dialog gia hạn: trường hợp không có phòng cùng giá phù hợp
- [x] Lưu file thiết kế vào repo: thư mục `design/` (không dùng canvas nữa)

## Câu hỏi đã chốt
- [x] Font Be Vietnam Pro; nút chính blue-600
- [x] Giữ ca mẫu mặc định; sửa/xoá ca mẫu không đổi các ca đã xếp
- [x] Quyền vai trò Nhân viên (xem business-rules.md)
- [x] Nhân viên không được huỷ đơn đã thu tiền, sửa số tiền đã thu, xem doanh thu
- [x] Nhân viên xem được Lịch làm, không thêm/sửa
- [x] Phụ thu theo ngày: tính cho từng ngày khách ở (theo giờ/qua đêm theo ngày nhận phòng)
- [x] Nhiều phụ thu: cùng ngày Tết + cuối tuần lấy mức cao hơn; quá giờ, thêm khách, thêm tay cộng dồn
- [x] Mật khẩu ≥ 8 ký tự, có chữ và số; bắt đổi ở lần đăng nhập đầu
- [x] Phút ân hạn: mặc định 15, cho sửa, khi tính không trừ phút ân hạn
- [x] Phụ thu quá giờ: luôn làm tròn lên theo giờ (trễ 30 phút → 1 giờ, 1 giờ 20 phút → 2 giờ)
- [x] Phụ thu quá giờ tính theo giá "mỗi giờ thêm" của hạng phòng

## Bước tiếp theo
- [x] Chốt các câu hỏi trên
- [ ] Bắt đầu code (Angular + PrimeNG, Spring Boot, MySQL): chưa bắt đầu
