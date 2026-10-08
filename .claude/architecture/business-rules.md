# Quy tắc nghiệp vụ đã chốt

## Check-in / check-out
- Mỗi phòng có hình thức mặc định: khách tự check-in/out hoặc nhân viên đón. Sửa được cho từng đơn.
- Khách tự check-in: trạng thái tự chuyển theo giờ, quản lý xác nhận lại (sửa giờ thực tế nếu cần).
- Mã cửa lưu riêng cho từng đơn.

## Nhân viên
- Có tài khoản riêng, vai trò Nhân viên hoặc Quản lý.
- Mọi thao tác ghi lại người thực hiện.
- Quyền vai trò Nhân viên (cố định theo vai trò, không cấu hình):
  - Được: xem lịch phòng, đơn thuê; tạo đơn, nhận/trả phòng, thu tiền; xem mã cửa đơn trong ca mình trực;
    xem phòng, bảng giá, phụ thu, nhân viên, lịch làm.
  - Không được: thêm/sửa phòng, sửa bảng giá, thêm/sửa phụ thu, thêm/sửa nhân viên, xếp/sửa lịch làm và ca mẫu.
  - Không được: huỷ đơn đã thu tiền, sửa số tiền đã thu, xem doanh thu.
- Mật khẩu: ≥ 8 ký tự, có cả chữ và số; tài khoản mới bắt đổi mật khẩu ở lần đăng nhập đầu.

## Lịch làm
- Ca làm không cố định → không cài ở màn nhân viên, quản lý ở mục riêng "Lịch làm".
- Có ca mẫu (thêm/sửa/xoá được); xếp ca theo mẫu rồi sửa giờ riêng từng ngày, hoặc xếp ca lẻ.
- Một nhân viên có thể làm nhiều ca trong một ngày; các ca không được trùng giờ.
- Ca mẫu mặc định: sáng 06:00–14:00, chiều 14:00–22:00, đêm 22:00–06:00.
- Ca đã xếp lưu bản sao giờ bắt đầu/kết thúc tại lúc xếp. Sửa hoặc xoá ca mẫu sau đó không làm đổi
  các ca đã xếp (kể cả ca của ngày tới); chỉ áp dụng cho ca xếp mới.

## Tin nhắn gửi khách
- Mẫu tin nhắn do Quản lý thêm/sửa/xoá; Nhân viên chỉ chọn mẫu và sao chép.
- Nội dung mẫu dùng biến: {ten_khach} {ma_don} {phong} {loai_thue} {gio_nhan} {gio_tra} {so_khach} {tong_tien}
  {da_coc} {con_phai_thu} {ma_cua} {huong_dan} (hướng dẫn của phòng) {ten_homestay} {dia_chi} {ban_do} {hotline}
  {wifi} {mat_khau_wifi}. Thông tin homestay nhập ở Cài đặt.
- Mỗi hình thức check-in (khách tự / nhân viên) có tối đa một mẫu tự chọn sẵn khi tạo đơn.
- Xem trước che mã cửa. Sao chép mẫu có {ma_cua} được ghi nhật ký như xem mã cửa.
- App chỉ tạo nội dung để sao chép, không tự gửi SMS/Zalo.

## Thông báo
- Thông báo là việc cần xử lý, tính từ trạng thái hiện tại; xử lý xong thì tự mất (không có đã đọc/chưa đọc).
- 4 loại: phòng quá giờ trả · đơn chờ xác nhận trả · sắp nhận phòng mà chưa gửi mã cửa (trong 2 giờ tới) ·
  đơn cần nhân viên đón nhưng không ai trực (chỉ Quản lý thấy).
- Đơn được tính là "đã gửi mã" khi sao chép tin nhắn có {ma_cua} cho đơn đó.
- Frontend tự cập nhật mỗi 1 phút.

## Giá & phụ thu
- Giá theo hạng phòng: 2 giờ đầu, mỗi giờ thêm, qua đêm, theo ngày.
- Phụ thu có 4 cách thu: + % tiền phòng · số tiền / giờ · số tiền / người · số tiền / đơn.
- Phụ thu quá giờ trả phòng:
  - Mức thu = giá "mỗi giờ thêm" của hạng phòng (không nhập mức riêng).
  - Phút ân hạn mặc định 15, quản lý sửa được trong dialog Sửa phụ thu.
  - Trả muộn trong thời gian ân hạn: không tính.
  - Quá ân hạn: tính từ giờ trả phòng (không trừ phút ân hạn), luôn làm tròn lên theo giờ.
    Ví dụ ân hạn 15 phút: trễ 10 phút → 0 · trễ 30 phút → 1 giờ · trễ 1 giờ 10 phút → 2 giờ.
- Phụ thu theo ngày ("Ngày trong tuần", "Khoảng ngày"): tính cho từng ngày khách ở nằm trong điều kiện,
  % tính trên giá phòng của ngày đó. Đơn theo giờ và qua đêm tính theo ngày nhận phòng.
  Ví dụ: Tết 05–10/02, thuê theo ngày 03→07/02 → chỉ 2 ngày 05, 06 bị tính.
- Đơn thoả nhiều phụ thu:
  - Cùng một ngày thoả cả "Ngày trong tuần" và "Khoảng ngày" (Tết rơi vào cuối tuần) → lấy mức cao hơn.
  - Quá giờ, vượt số khách, thêm tay → luôn cộng dồn, kể cả với phụ thu theo ngày.

## Gia hạn
- Mỗi lần thêm 1 giờ hoặc 1 ngày. Thêm giờ tính giá "mỗi giờ thêm", thêm ngày tính giá ngày.
- Nên báo trước giờ trả 1 tiếng; báo muộn vẫn cho nếu không đụng đơn sau.
- Giờ trả mới phải cách giờ nhận phòng của đơn sau ít nhất 1 tiếng.
  Ví dụ: đơn sau nhận 14:00 → chỉ gia hạn đến 13:00.
- Trùng đơn sau → chỉ chuyển khách đang gia hạn (không chuyển đơn sau) sang phòng:
  - cùng giá,
  - đã dọn (phòng chưa dọn không hiện trong danh sách),
  - trống suốt thời gian gia hạn.
- Không cần nhắc kiểm tra mã cửa khi gia hạn.
