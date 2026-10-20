# Kế hoạch sửa lỗi phát hiện khi làm tài liệu GĐ 11 (GĐ 13)

Trạng thái: đã duyệt (20/10/2026), đang làm. Làm trước GĐ 12 (hướng dẫn sử dụng) để ảnh hướng dẫn chụp từ app đã sửa.

## Đã chốt với người dùng
- Lỗi 1 sửa ở cả gia hạn chuyển phòng lẫn tạo/sửa đơn; đơn Chờ xác nhận trả (khách tự check-in) coi là còn khách.
- Phụ thu "Thêm tay vào đơn": chỉ sửa chữ hướng dẫn (chọn khi trả phòng), không thêm chọn lúc tạo/sửa đơn.
- Ô bắt buộc chưa nhập: viền đỏ chung cho mọi form + hộp lỗi "Vui lòng nhập đủ các ô bắt buộc".

## Đề xuất (đã duyệt)
- Quy tắc "phòng còn khách": đơn Quá giờ / Chờ xác nhận trả đang ở phòng (chặng hiện tại) được coi là chiếm phòng
  tới **bây giờ + 1 tiếng** (cùng khoảng cách 1 tiếng đang dùng khi gia hạn). Hệ quả: không chuyển khách gia hạn vào phòng
  đó; tạo/sửa đơn có giờ nhận trước mốc đó bị báo "Phòng còn khách {mã đơn} chưa trả phòng". Đơn đặt cho giờ sau mốc
  vẫn đặt được (không chặn lịch tương lai vô thời hạn). Hiển thị "phòng trống" ở màn Tạo đơn dùng cùng quy tắc.
- Xem trước mẫu tin nhắn ở Cài đặt (theo `design/CaiDat.html`): dùng một đơn mẫu cố định (khách, phòng, giờ, tiền mẫu)
  + thông tin homestay hiện tại + hướng dẫn mẫu; `{ma_cua}` hiện "●●●●●● (hiện khi sao chép)". Không gọi API mới,
  không ghi nhật ký.

## Giai đoạn (mỗi phần xong → commit)
### [x] 13.1 Phòng còn khách quá giờ / chờ xác nhận trả (backend + test)
- Truy vấn trùng lịch (`RentalOrderRepository.findOverlapping` và nơi dùng: tạo/sửa đơn, xem trước, phòng chuyển khi gia
  hạn) coi chặng hiện tại của đơn OVERSTAY / PENDING_CHECKOUT kéo dài tới bây giờ + 1 tiếng.
- Thông báo trùng riêng cho trường hợp này. Unit test + integration test (gia hạn không còn đề xuất phòng đó; tạo đơn
  bị chặn; đơn sau mốc vẫn tạo được).
### 13.2 Lỗi giao diện nhỏ (frontend + test)
- Tab "Tất cả" ở Đơn thuê = tổng countByStatus (không phụ thuộc tab đang chọn).
- Form Trả phòng: ô ngày giờ không tràn khung chi tiết đơn (sửa CSS lưới, kiểm tra 1440/1280/1024/768).
- Nhãn "{N} giờ đầu" theo số giờ tối thiểu ở thẻ phòng, màn Thêm/Sửa phòng, dialog Bảng giá.
- Chữ hướng dẫn phụ thu "Thêm tay vào đơn": chọn khi trả phòng.
### 13.3 Báo ô bắt buộc chưa nhập (frontend)
- `styles.scss`: ô `.inp` / ô chọn bắt buộc đã chạm mà không hợp lệ → viền đỏ (light + dark mode).
- Các form có nút lưu (Tạo/Sửa đơn, Thêm/Sửa phòng, Thêm/Sửa nhân viên, Bảng giá, Phụ thu, Cài đặt, Lịch làm): bấm lưu khi
  thiếu ô → hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ)." thay vì im lặng. Test cho từng form.
### 13.4 Giới hạn độ dài ô chữ (backend + frontend + test)
- Request backend thêm `@Size` khớp cột DB (đơn, phòng, hạng phòng, phụ thu + khoảng ngày, homestay, mẫu tin nhắn) →
  lỗi 400 theo trường thay vì 500.
- Frontend thêm `maxlength` tương ứng cho các ô chữ.
### 13.5 Xem trước mẫu tin nhắn ở Cài đặt (frontend + test)
- Khung "Xem trước" dưới phần chèn biến, cập nhật khi gõ; dùng lại `renderMessageTemplate`.
### 13.6 Cập nhật tài liệu
- `.claude/architecture` (business-rules, project-structure); chạy lại công cụ detail design cho các file bị ảnh hưởng
  (00, 06, 07, 08, 09, 10, 11, 12, 13, 15, 16, 17), thêm dòng lịch sử phiên bản 1.1, bỏ các ghi chú "đã báo lại".
- Đánh dấu xong các mục ở `todo.md` mục "Lỗi phát hiện khi làm tài liệu GĐ 11".

## Kiểm tra
- `./mvnw verify` (JaCoCo ≥ 80%), `npx ng test --watch=false` (≥ 80% dòng).
- Chạy app kiểm tra tay bằng chính công cụ chụp ảnh (`docs/tools`) — các ảnh 06, 07 (trả phòng), 09 (chuyển phòng), 17
  phải thể hiện đúng bản sửa; DB dev về baseline sau khi chụp.
