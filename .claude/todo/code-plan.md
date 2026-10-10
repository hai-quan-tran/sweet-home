# Kế hoạch code

Mỗi giai đoạn gồm backend + frontend + unit test, chạy được end-to-end.
Xong giai đoạn → người dùng xác nhận → commit. Không tự push.

Trạng thái: GĐ 2 xong. Tiếp theo: GĐ 3.

## Quyết định kỹ thuật (đã chốt)
- Cấu trúc repo: `backend/` (Spring Boot) + `frontend/` (Angular) trong cùng repo.
- Backend: Java 25, Spring Boot 4, Maven, Spring Security + JWT, Spring Data JPA, Liquibase, MySQL 8.
- JDK 25 cài song song JDK 17 (xem `architecture/dev-environment.md`); build bằng Maven Wrapper + toolchains trỏ tới JDK 25.
- Frontend: Angular 21 (standalone, signals), PrimeNG Aura (primary blue, nút chính blue-600), font Be Vietnam Pro, dark mode.
- Dev: MySQL 8 cài trên máy local (song song MySQL 5.7, cổng 3307), DB `sweet_home`.
- Cấu hình chia profile: `application.yml` (chung) + `application-dev.yml` / `application-stage.yml` / `application-prod.yml`.
  - dev: ghi thẳng thông tin kết nối DB, khoá JWT/AES dùng cho máy local.
  - stage, prod: mọi thông tin kết nối và khoá bí mật lấy từ biến môi trường.
- Test: JUnit 5 + Mockito, JaCoCo ≥ 80% (dưới mức thì build lỗi). Frontend test service/logic bằng công cụ mặc định của Angular 21.
- Đăng nhập:
  - Access token 30 phút, refresh token 7 ngày; "Ghi nhớ thiết bị" → refresh token 30 ngày.
  - Cả hai token nằm trong cookie HttpOnly, Secure, SameSite; không lưu token ở localStorage/sessionStorage.
  - Vì dùng cookie nên bật chống CSRF cho request thay đổi dữ liệu.
  - Refresh token lưu (dạng băm) trong DB để thu hồi được khi đăng xuất, đổi mật khẩu, khoá tài khoản.
- Bảo mật dữ liệu: mật khẩu BCrypt; CCCD và mã cửa mã hoá AES trong DB, xem mã cửa ghi nhật ký.
- Tiền: VND số nguyên (long). Múi giờ: Asia/Ho_Chi_Minh.
- Ảnh phòng: lưu trên đĩa server (thư mục cấu hình), DB lưu đường dẫn.
- Tin nhắn gửi khách: chỉ tạo nội dung để sao chép, không tự gửi SMS/Zalo.
- Thông báo (chuông): quá giờ, chờ xác nhận trả, sắp nhận phòng chưa gửi mã, thiếu nhân viên trực; frontend hỏi lại mỗi 1 phút.

## Giai đoạn
### GĐ 0: Khung dự án ✅
- Backend: khung Spring Boot, cấu hình MySQL/Liquibase theo profile, xử lý lỗi chung, JaCoCo.
- Frontend: khung Angular + PrimeNG Aura, layout chung (menu trái, thanh trên, nút dark mode), routing các màn (trống).
- README: cách tạo DB trên MySQL local, biến môi trường, cách chạy backend/frontend.

### GĐ 1: Đăng nhập & phân quyền ✅
- Bảng tài khoản (vai trò Quản lý / Nhân viên), tài khoản admin khởi tạo.
- API đăng nhập, refresh, đăng xuất, đổi mật khẩu; bắt đổi mật khẩu lần đầu; quy tắc mật khẩu.
- Phân quyền theo vai trò ở API (JWT trong cookie, `@EnableMethodSecurity` sẵn sàng cho các
  phase sau dùng `@PreAuthorize`); ghi người thực hiện cho mọi thao tác (nền cho nhật ký qua
  JPA Auditing). Chi tiết kỹ thuật và các lỗi đã gặp: xem `project-structure.md`.
- Frontend: màn Đăng nhập, đổi mật khẩu, guard, interceptor; thanh trên hiện tên/vai trò + đăng xuất.
  Đã kiểm tra bằng Playwright thủ công (đăng nhập → bắt đổi mật khẩu → Tổng quan → đăng xuất →
  đăng nhập lại), không còn dùng trong dự án (chỉ kiểm tra một lần).

### GĐ 2: Phòng, hạng phòng, bảng giá ✅
- Hạng phòng + giá (2 giờ đầu, mỗi giờ thêm, qua đêm, theo ngày), khung giờ chung (số giờ tối thiểu, giờ qua đêm, giờ theo ngày).
- Phòng: số, tên, tầng, hạng, số khách tối đa, giường, mô tả, ảnh, hình thức check-in mặc định, bật/tắt nhận đặt.
  Giá theo hạng hoặc giá riêng cho từng phòng.
- Hạng phòng xoá mềm (cờ `active`, không xoá cứng): không ẩn được khi còn phòng dùng; dialog Sửa
  bảng giá có khu vực "Hạng phòng đã ẩn" để khôi phục. Gán phòng chặn hạng đã ẩn. Lý do: xem
  `business-rules.md` mục "Xoá mềm & lưu lịch sử (snapshot)" — chuẩn bị cho đơn (GĐ4) giữ nguyên
  tên/giá hạng phòng lúc đặt, không đổi theo khi hạng bị sửa/ẩn sau đó.
- Frontend: màn Phòng & bảng giá (3 tab: Phòng/Bảng giá/Phụ thu — tab Phụ thu để trống chờ GĐ3),
  Thêm/Sửa phòng, dialog Sửa bảng giá. Nhân viên chỉ xem, ẩn mọi nút sửa.
  Đã kiểm tra bằng Playwright thủ công (đăng nhập Quản lý → sửa bảng giá → thêm phòng → sửa phòng
  → bật/tắt nhận đặt → đăng nhập Nhân viên kiểm tra không thấy nút sửa, vào thẳng URL thêm phòng
  bị chặn), không còn dùng trong dự án. Phát hiện và sửa 3 lỗi thật: `@PreAuthorize` ném
  `AccessDeniedException` bị `GlobalExceptionHandler` nuốt thành 500 thay vì 403 (đã thêm handler
  riêng); `computed()` không phản ứng khi đổi FormControl.value (đã chuyển qua `toSignal`); dữ
  liệu test sót lại giữa các lần chạy script làm sai lệch kết quả (đã dọn, không phải lỗi app).
  Chi tiết kỹ thuật: xem `project-structure.md`.

### GĐ 3: Phụ thu
- Cấu hình 5 loại phụ thu, 4 cách thu, hạng phòng áp dụng.
- Phụ thu xoá mềm (cờ `active`) giống hạng phòng ở GĐ2: không xoá cứng, ẩn khỏi danh sách chọn,
  có khu vực "đã ẩn" để khôi phục. Xem `business-rules.md` mục "Xoá mềm & lưu lịch sử (snapshot)".
- Bộ tính phụ thu (test kỹ): quá giờ làm tròn lên theo giá mỗi giờ thêm + ân hạn; theo từng ngày; Tết + cuối tuần lấy mức cao hơn; cộng dồn quá giờ/thêm khách/thêm tay.
- Frontend: danh sách phụ thu, dialog Sửa phụ thu.

### GĐ 4: Tạo đơn & danh sách đơn
- Đơn: khách (tên, SĐT, CCCD, số khách, nguồn), phòng, loại thuê, giờ nhận/trả (tự tính), cọc, hình thức check-in, mã cửa, giá chốt lúc đặt.
- Đơn lưu snapshot tên hạng phòng + 4 mức giá và tên + mức thu từng phụ thu đã áp dụng ngay lúc tạo/tính,
  không chỉ tham chiếu id — đơn cũ không đổi khi hạng phòng/phụ thu bị sửa hoặc ẩn sau đó (xem
  `business-rules.md`). Phòng không xoá được nên tham chiếu phòng qua id vẫn an toàn.
- Kiểm tra trùng lịch, báo phòng trống; tính tiền (giá + phụ thu).
- Cài đặt: thông tin homestay, mẫu tin nhắn (biến, mẫu tự chọn sẵn theo hình thức check-in); ghép nội dung tin nhắn từ đơn,
  sao chép mẫu có mã cửa thì ghi nhật ký.
- Frontend: màn Tạo đơn (kèm tóm tắt, sao chép tin nhắn), màn Đơn thuê (tab trạng thái, tìm kiếm, lọc, chi tiết).
- Frontend: màn Cài đặt (Nhân viên chỉ xem).

### GĐ 5: Vòng đời đơn
- Trạng thái: Đã đặt → Đang ở → Quá giờ → Chờ xác nhận trả → Đã trả / Đã huỷ.
- Khách tự check-in: tự chuyển trạng thái theo giờ (tác vụ định kỳ), quản lý xác nhận và sửa giờ thực tế.
- Nhận/trả phòng, thu tiền, phụ thu quá giờ khi trả, huỷ đơn (theo quyền); trạng thái phòng Chờ dọn → Trống.
- Frontend: nút thao tác trong chi tiết đơn, xác nhận trả phòng.

### GĐ 6: Lịch đặt phòng & gia hạn
- API timeline theo ngày/tuần/tháng; bấm ô trống tạo đơn.
- Gia hạn: thêm giờ/ngày, cách đơn sau ≥ 1 tiếng, chuyển phòng cùng giá đã dọn và trống (đơn có nhiều chặng), không có phòng thì khoá và gợi ý thêm giờ.
- Frontend: màn Lịch đặt phòng, dialog Gia hạn (3 trường hợp).

### GĐ 7: Nhân viên & nhật ký
- Thêm/sửa/khoá tài khoản nhân viên (Quản lý), nhật ký thao tác có lọc.
- Frontend: màn Nhân viên, Thêm nhân viên.

### GĐ 8: Lịch làm
- Ca mẫu (thêm/sửa/xoá), xếp ca theo mẫu (lưu bản sao giờ) hoặc ca lẻ, không trùng giờ, sao chép tuần trước.
- Cảnh báo đơn cần nhân viên đón nhưng không ai trực.
- Frontend: màn Lịch làm (Nhân viên chỉ xem).

### GĐ 9: Tổng quan & thông báo
- Chỉ số hôm nay, tình trạng phòng, việc cần làm, doanh thu 7 ngày, cơ cấu đơn tháng, công suất (doanh thu chỉ Quản lý).
- Thông báo trên chuông.

### GĐ 10: Hoàn thiện
- Kiểm tra giao diện desktop/laptop/iPad, dark mode; rà soát bảo mật; bổ sung test đạt độ phủ.
