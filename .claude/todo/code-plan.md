# Kế hoạch code

Mỗi giai đoạn gồm backend + frontend + unit test, chạy được end-to-end.
Xong giai đoạn → người dùng xác nhận → commit. Không tự push.

Trạng thái: chờ xác nhận kế hoạch và các quyết định kỹ thuật bên dưới.

## Quyết định kỹ thuật (đề xuất, chờ xác nhận)
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
### GĐ 0: Khung dự án
- Backend: khung Spring Boot, cấu hình MySQL/Liquibase theo profile, xử lý lỗi chung, JaCoCo.
- Frontend: khung Angular + PrimeNG Aura, layout chung (menu trái, thanh trên, nút dark mode), routing các màn (trống).
- README: cách tạo DB trên MySQL local, biến môi trường, cách chạy backend/frontend.

### GĐ 1: Đăng nhập & phân quyền
- Bảng tài khoản (vai trò Quản lý / Nhân viên), tài khoản admin khởi tạo.
- API đăng nhập, refresh, đăng xuất, đổi mật khẩu; bắt đổi mật khẩu lần đầu; quy tắc mật khẩu.
- Phân quyền theo vai trò ở API; ghi người thực hiện cho mọi thao tác (nền cho nhật ký).
- Frontend: màn Đăng nhập, đổi mật khẩu, guard, interceptor, ẩn menu/nút theo vai trò.

### GĐ 2: Phòng, hạng phòng, bảng giá
- Hạng phòng + giá (2 giờ đầu, mỗi giờ thêm, qua đêm, theo ngày), khung giờ chung (số giờ tối thiểu, giờ qua đêm, giờ theo ngày).
- Phòng: số, tên, tầng, hạng, số khách tối đa, giường, mô tả, ảnh, hình thức check-in mặc định, bật/tắt nhận đặt.
- Frontend: màn Phòng & bảng giá, Thêm/Sửa phòng, dialog Sửa bảng giá.

### GĐ 3: Phụ thu
- Cấu hình 5 loại phụ thu, 4 cách thu, hạng phòng áp dụng.
- Bộ tính phụ thu (test kỹ): quá giờ làm tròn lên theo giá mỗi giờ thêm + ân hạn; theo từng ngày; Tết + cuối tuần lấy mức cao hơn; cộng dồn quá giờ/thêm khách/thêm tay.
- Frontend: danh sách phụ thu, dialog Sửa phụ thu.

### GĐ 4: Tạo đơn & danh sách đơn
- Đơn: khách (tên, SĐT, CCCD, số khách, nguồn), phòng, loại thuê, giờ nhận/trả (tự tính), cọc, hình thức check-in, mã cửa, giá chốt lúc đặt.
- Kiểm tra trùng lịch, báo phòng trống; tính tiền (giá + phụ thu).
- Frontend: màn Tạo đơn (kèm tóm tắt, sao chép tin nhắn), màn Đơn thuê (tab trạng thái, tìm kiếm, lọc, chi tiết).

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
