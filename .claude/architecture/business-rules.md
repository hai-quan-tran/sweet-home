# Quy tắc nghiệp vụ đã chốt

## Check-in / check-out
- Mỗi phòng có hình thức mặc định: khách tự check-in/out hoặc nhân viên đón. Sửa được cho từng đơn.
- Khách tự check-in: trạng thái tự chuyển theo giờ, quản lý xác nhận lại (sửa giờ thực tế nếu cần).
- Mã cửa lưu riêng cho từng đơn.
- Tự chuyển trạng thái theo giờ (mỗi phút):
  - Khách tự check-in: đến giờ nhận → Đang ở; đến giờ trả → Chờ xác nhận trả.
  - Nhân viên đón: nhân viên bấm Nhận phòng; quá giờ nhận mà khách chưa tới vẫn giữ Đã đặt;
    đang ở mà quá giờ trả → Quá giờ.
- Trả phòng sớm hơn giờ đã đặt: không giảm tiền.
- Trả phòng phải thu đủ số còn lại (chọn hình thức) ngay lúc xác nhận trả; không cho trả khi còn nợ.
- Sau khi trả phòng, phòng chuyển Chờ dọn; bấm "Đã dọn" để về Trống.

## Tiền cọc & thu tiền
- Tạo đơn bắt buộc có cọc: > 0, không vượt tổng tiền, bắt buộc chọn hình thức cọc.
- "Đã thu" của đơn = cọc + các khoản thu thêm. Chỉ Quản lý sửa/xoá được khoản đã thu (kể cả cọc).

## Sửa đơn
- Chỉ sửa được khi đơn còn Đã đặt. Đổi phòng/giờ thì tính lại giá theo bảng giá hiện hành
  (như tạo đơn mới), có kiểm tra trùng lịch. Sửa tiền cọc chỉ Quản lý.

## Huỷ đơn
- Chỉ huỷ được đơn ở trạng thái Đã đặt hoặc Đang ở. Riêng đơn khách tự check-in mà khách không
  đến (đã tự chuyển sang Chờ xác nhận trả) cũng huỷ được, không hoàn cọc.
- Hoàn cọc theo thời điểm huỷ so với giờ nhận phòng của đơn:
  - Trước giờ nhận phòng 1 ngày trở lên: hoàn 100% cọc.
  - Trong vòng 1 ngày trước giờ nhận phòng: hoàn 50% cọc.
  - Từ giờ nhận phòng trở đi (gồm đơn Đang ở): không hoàn cọc.
  - "1 ngày" = 24 giờ. Ví dụ nhận phòng 14:00 ngày 15: huỷ đến 14:00 ngày 14 → 100%; sau đó đến
    trước 14:00 ngày 15 → 50%; từ 14:00 ngày 15 → 0%.
- App tự tính số tiền hoàn làm mặc định; chỉ Quản lý được sửa lại khi cần.
- Lý do huỷ: bắt buộc khi số tiền hoàn khác mức app tự tính, các trường hợp khác không bắt buộc.
- Huỷ đơn Đang ở chỉ dành cho khách không đến (trạng thái tự chuyển theo giờ). Khách đã vào ở thì
  không huỷ mà trả phòng, tính tiền như bình thường.
- Mọi đơn đều có cọc (bắt buộc nhập lúc tạo đơn). Nhân viên được huỷ đơn chỉ có cọc; đơn đã thu
  thêm tiền ngoài cọc thì chỉ Quản lý huỷ ("đã thu tiền" = có khoản thu ngoài cọc).
- Huỷ là không hoàn tác được. Muốn khôi phục thì tạo đơn mới trong khung giờ đó.

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

## Xoá mềm & lưu lịch sử (snapshot)
- Hạng phòng, phụ thu: không xoá cứng. "Xoá" = ẩn khỏi danh sách chọn (cờ `active`), không chọn được
  khi tạo/sửa phòng hoặc khi áp phụ thu mới. Chỉ ẩn được khi không còn phòng đang dùng (hạng phòng)
  hoặc không còn áp dụng hiện hành nào (phụ thu). Màn quản lý (tab Bảng giá, màn Phụ thu) có khu vực
  "đã ẩn" để xem và khôi phục (đưa active lại true).
- Phòng: không xoá được, kể cả mềm. Chỉ tắt "Nhận đặt phòng". Vì đơn luôn cần trỏ tới một phòng cụ thể.
- Đơn (từ GĐ4): lưu snapshot (tên hạng phòng + 4 mức giá, tên + mức thu từng phụ thu đã áp dụng)
  ngay lúc tạo đơn / lúc tính phụ thu, tách biệt khỏi bản ghi hạng phòng, phụ thu gốc. Sau khi sửa
  hoặc ẩn hạng phòng/phụ thu, đơn cũ vẫn hiển thị đúng thông tin tại thời điểm đặt, không đổi theo
  bảng giá/phụ thu hiện hành.

## Giá & phụ thu
- Giá theo hạng phòng: 2 giờ đầu, mỗi giờ thêm, qua đêm, theo ngày.
- Phụ thu: mỗi "áp dụng khi" gắn cố định đúng 1 cách thu (không cho chọn tự do, tránh cấu hình mơ
  hồ — đã chốt lại với người dùng ở GĐ3, khác bản mock ban đầu):
  - Quá giờ trả phòng → giá "mỗi giờ thêm" của hạng phòng (không nhập mức riêng).
  - Vượt số khách tối đa → số tiền / khách vượt.
  - Ngày trong tuần, Khoảng ngày → % tiền phòng.
  - Thêm tay vào đơn → số tiền cố định / lần thêm.
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
