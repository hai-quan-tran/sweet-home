# Kế hoạch code

Mỗi giai đoạn gồm backend + frontend + unit test, chạy được end-to-end.
Xong giai đoạn → người dùng xác nhận → commit. Không tự push.

Trạng thái: GĐ 7.1 xong. Tiếp theo: GĐ 7.2.

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

### GĐ 3: Phụ thu ✅
- Cấu hình 5 loại phụ thu (quá giờ, vượt khách, ngày trong tuần, khoảng ngày, thêm tay). Mỗi loại
  gắn cố định 1 đơn vị tính (không cho chọn "cách thu" tự do như mock ban đầu — đã hỏi lại và chốt
  với người dùng để tránh cấu hình mơ hồ, xem `project-structure.md`).
- Phụ thu xoá mềm (cờ `active`) giống hạng phòng ở GĐ2, nhưng chưa chặn ẩn theo "còn áp dụng hiện
  hành" vì GĐ3 chưa có đơn tham chiếu tới; quá giờ & vượt khách giới hạn chỉ 1 bản ghi active mỗi
  loại (singleton), còn lại cho phép nhiều bản ghi.
- Bộ tính phụ thu (`SurchargeCalculator`, test kỹ qua `SurchargeCalculatorTest`): quá giờ làm tròn
  lên theo giá mỗi giờ thêm + ân hạn; theo từng ngày; Tết + cuối tuần lấy mức cao hơn; cộng dồn quá
  giờ/thêm khách/thêm tay. Chưa nối vào đơn (đợi GĐ4).
- Frontend: danh sách phụ thu, dialog Thêm/Sửa phụ thu (tab Phụ thu trong màn Phòng & bảng giá).
  Đã kiểm tra bằng Playwright thủ công (đăng nhập → thêm hạng phòng → thêm phụ thu "Cuối tuần" →
  xác nhận hiện đúng +10% → sửa → ẩn → khôi phục), không còn dùng trong dự án. Phát hiện và sửa 1
  lỗi thật: `SurchargeDto` trả thẳng collection lazy (`PersistentSet`) của Hibernate ra ngoài DTO,
  với `open-in-view=false` làm GET `/surcharges` lỗi 500 ngay khi đã có phụ thu kiểu WEEKDAY/
  DATE_RANGE; chi tiết và bài học áp dụng cho các phase sau xem `project-structure.md`.

### GĐ 4: Tạo đơn & danh sách đơn ✅
- Đơn: khách (tên, SĐT, CCCD, số khách, nguồn), phòng, loại thuê, giờ nhận/trả (tự tính theo khung
  giờ chung), cọc, hình thức check-in, mã cửa (bắt buộc khi khách tự check-in), giá chốt lúc đặt.
  CCCD và mã cửa mã hoá AES-256/GCM (`CryptoService`, khoá `app.crypto.secret`); CCCD chỉ trả về
  dạng che 4 số cuối, mã cửa có endpoint giải mã riêng.
- Đơn lưu snapshot tên hạng phòng + 4 mức giá, tiền phòng đã tính, và tên + mức thu từng phụ thu
  đã áp dụng (bảng con `order_surcharge`) ngay lúc tạo — không tham chiếu ngược hạng phòng/phụ thu
  gốc, đơn cũ không đổi khi hạng phòng/phụ thu bị sửa hoặc ẩn sau đó (xem `business-rules.md`).
- Kiểm tra trùng lịch (chặn tạo đơn chồng giờ cùng phòng), báo phòng trống; tính tiền phòng theo
  loại thuê (theo giờ/qua đêm/theo ngày) + phụ thu tự động (vượt khách, theo ngày) — quá giờ và
  thêm tay **chưa** áp dụng lúc tạo (chưa có giờ trả thực tế / chưa có nơi chọn tay ở GĐ4, đợi GĐ5).
  Có endpoint "xem trước" (preview, không lưu DB) để màn Tạo đơn tự cập nhật giờ trả + tóm tắt tiền
  khi người dùng gõ, tránh lặp logic tính toán ở frontend.
- Cài đặt: thông tin homestay (1 dòng, singleton giống `PricingSettings`), mẫu tin nhắn (CRUD, tối
  đa 1 mẫu mặc định mỗi hình thức check-in — lưu mẫu mới nhận mặc định tự bỏ mặc định ở mẫu cũ).
  Mẫu tin nhắn **không xoá mềm** (xoá cứng được) vì đơn không tham chiếu tới mẫu, chỉ render tạm
  lúc sao chép — khác hạng phòng/phụ thu.
- Ghép nội dung tin nhắn từ đơn làm hoàn toàn ở **frontend** (`core/message-template.ts`, hàm
  thuần `renderMessageTemplate`/`buildOrderMessageContext`), không có endpoint backend riêng —
  giữ đúng tinh thần "app chỉ tạo nội dung để sao chép". Biến `{huong_dan}` lấy `checkInGuide`
  **hiện hành** của phòng (gọi `GET /rooms/{id}`), không snapshot, vì hướng dẫn phòng không thuộc
  nhóm giá/phụ thu cần đóng băng theo lịch sử.
- **Phạm vi cố ý cắt bớt ở GĐ4** (không phải thiếu sót, đã đối chiếu lại với phần GĐ5 trong kế
  hoạch): chưa ghi nhật ký thao tác xem mã cửa/sao chép tin nhắn có mã cửa (hạ tầng nhật ký là của
  GĐ7, theo đúng tiền lệ đã chốt ở GĐ1 — xem `project-structure.md`); mã cửa cho Nhân viên xem
  không giới hạn theo "đang trong ca trực" (hạ tầng Lịch làm là GĐ8); đơn thuê **chỉ tạo & xem**,
  chưa sửa/huỷ/đổi trạng thái/thu tiền (toàn bộ vòng đời đơn là GĐ5); phụ thu "thêm tay" chưa chọn
  được lúc tạo đơn (chỉ áp dụng được từ GĐ5 khi có nơi thao tác theo từng mốc của đơn).
- Frontend: màn Tạo đơn (3 bước: phòng & thời gian · thông tin khách · cọc & giảm giá; tóm tắt +
  "Lưu & sao chép tin nhắn"), màn Đơn thuê (tab trạng thái, tìm kiếm, lọc theo phòng, phân trang,
  chi tiết đơn chỉ xem — không có hành động vòng đời). Màn Cài đặt (2 tab: Mẫu tin nhắn, Thông tin
  homestay; Nhân viên chỉ xem — `<fieldset disabled>` bọc quanh form thay vì khoá từng ô).
  Đã kiểm tra bằng Playwright thủ công toàn bộ luồng (cài đặt homestay + mẫu tin nhắn → thêm hạng
  phòng + phòng → tạo đơn, xem tóm tắt tự cập nhật → Lưu & sao chép tin nhắn → xác nhận nội dung
  đã sao chép đúng biến → mở lại đơn trong danh sách, hiện mã cửa → tạo đơn trùng giờ bị chặn đúng
  thông báo), không còn dùng trong dự án. Không phát hiện lỗi thật lần này (khác GĐ2/GĐ3), có thể
  nhờ áp dụng ngay bài học "copy khỏi collection lazy trước khi đưa vào DTO" từ GĐ3 cho
  `RentalOrder.surcharges` và viết thêm `OrderSerializationIntegrationTest` (không `@Transactional`)
  để tự kiểm chứng điều đó trước khi test tay.

### GĐ 5: Vòng đời đơn ✅
- Trạng thái: Đã đặt → Đang ở → Quá giờ → Chờ xác nhận trả → Đã trả / Đã huỷ.
- Quy tắc nghiệp vụ đã chốt: `business-rules.md` (Check-in/check-out, Huỷ đơn, Tiền cọc & thu
  tiền, Sửa đơn). Chia 5 phần, mỗi phần xong → xác nhận → commit:
- [x] 5.1 Thu tiền: cọc bắt buộc (> 0, ≤ tổng, có hình thức); bảng khoản thu (số tiền, hình thức,
  thời điểm, người thu); chi tiết đơn hiện Tổng / Đã thu / Còn phải thu; NV thu được, chỉ Quản lý
  sửa/xoá khoản đã thu.
- [x] 5.2 Nhận phòng & tự chuyển trạng thái: tác vụ mỗi phút (tự check-in: Đang ở → Chờ xác nhận
  trả; NV đón: Đang ở → Quá giờ); nút Nhận phòng cho đơn NV đón.
- [x] 5.3 Trả phòng: giờ nhận/trả thực tế sửa được, phụ thu quá giờ, phụ thu thêm tay, thu đủ số
  còn lại → Đã trả; phòng Chờ dọn, nút "Đã dọn" ở màn Phòng → Trống.
- [x] 5.4 Huỷ đơn: hoàn cọc 100/50/0%, chỉ Quản lý sửa số hoàn, lý do bắt buộc khi sửa, NV chỉ huỷ
  đơn chỉ có cọc.
- [x] 5.5 Sửa đơn: chỉ khi Đã đặt, tính lại giá theo bảng giá hiện hành, kiểm tra trùng lịch.

### GĐ 6: Lịch đặt phòng & gia hạn ✅
- API timeline theo ngày/tuần/tháng; bấm ô trống tạo đơn.
- Gia hạn: thêm giờ/ngày, cách đơn sau ≥ 1 tiếng, chuyển phòng cùng giá đã dọn và trống (đơn có nhiều chặng), không có phòng thì khoá và gợi ý thêm giờ.
- Frontend: màn Lịch đặt phòng, dialog Gia hạn (3 trường hợp).
- Đã chốt với người dùng: phí gia hạn là dòng riêng ("Gia hạn +2 giờ") trong danh sách phụ thu của
  đơn; "cùng giá" = đủ 4 mức giá hiện hành bằng phòng đang ở; phòng cũ tự sang Chờ dọn khi chặng
  cũ kết thúc (tác vụ mỗi phút); lịch xem theo ngày hiện 00:00–24:00.
- Chia 4 phần, mỗi phần xong → xác nhận → commit:
- [x] 6.1 Chặng của đơn: bảng `order_stay` (phòng, từ, đến), mọi đơn ≥ 1 chặng, chuyển dữ liệu
  đơn cũ; kiểm tra trùng lịch theo chặng. Không đổi hành vi.
- [x] 6.2 Lịch đặt phòng: API timeline ngày/tuần/tháng; màn Lịch (phòng × thời gian, vạch bây giờ,
  chú thích); bấm ô trống → Tạo đơn điền sẵn phòng + giờ; tách chi tiết đơn thành component dùng
  chung cho màn Đơn thuê và Lịch.
- [x] 6.3 Gia hạn tại phòng: thêm giờ/ngày (đơn Đang ở, Quá giờ, Chờ xác nhận trả), giờ trả mới
  cách đơn sau ≥ 1 tiếng, thu ngay hoặc cộng lúc trả, gia hạn xong về Đang ở.
- [x] 6.4 Chuyển phòng: trùng đơn sau → chọn phòng cùng giá, đã dọn, đang nhận đặt, trống suốt
  thời gian gia hạn (+1 tiếng trước đơn sau); thêm chặng mới; không có phòng → khoá, gợi ý thêm giờ.

### GĐ 7: Nhân viên & nhật ký
- Thêm/sửa/khoá tài khoản nhân viên (Quản lý), nhật ký thao tác có lọc.
- Frontend: màn Nhân viên, Thêm nhân viên.
- Đã chốt với người dùng: nhật ký ghi thao tác đơn (tạo/sửa, nhận/trả phòng, thu/sửa/xoá tiền, huỷ,
  gia hạn/chuyển phòng, đã dọn, tự chuyển trạng thái = "Hệ thống"), xem mã cửa, sao chép tin nhắn có
  mã cửa, thêm/sửa/khoá tài khoản — không ghi sửa cấu hình (phòng, giá, phụ thu, cài đặt). Nhân viên
  xem danh sách tài khoản + quyền, không xem nhật ký. Khoá/đổi vai trò có hiệu lực ngay (filter kiểm
  tra tài khoản trong DB mỗi request). Quản lý không tự khoá / tự hạ vai trò chính mình.
- Nhãn "Đang trong ca" và thao tác "Bắt đầu ca" để GĐ8 (cần Lịch làm).
- Chia 2 phần, mỗi phần xong → xác nhận → commit:
- [x] 7.1 Tài khoản nhân viên: thêm SĐT, CCCD (mã hoá), ngày bắt đầu làm; API danh sách / thêm / sửa /
  khoá-mở / đặt lại mật khẩu tạm; khoá hoặc đổi vai trò có hiệu lực ngay; màn Nhân viên (Tài khoản +
  Quyền) và Thêm/Sửa nhân viên.
- [ ] 7.2 Nhật ký thao tác: bảng `activity_log`, ghi từ các thao tác trên; API lọc theo thời gian /
  người, phân trang (chỉ Quản lý); card Nhật ký ở màn Nhân viên.

### GĐ 8: Lịch làm
- Ca mẫu (thêm/sửa/xoá), xếp ca theo mẫu (lưu bản sao giờ) hoặc ca lẻ, không trùng giờ, sao chép tuần trước.
- Cảnh báo đơn cần nhân viên đón nhưng không ai trực.
- Frontend: màn Lịch làm (Nhân viên chỉ xem).

### GĐ 9: Tổng quan & thông báo
- Chỉ số hôm nay, tình trạng phòng, việc cần làm, doanh thu 7 ngày, cơ cấu đơn tháng, công suất (doanh thu chỉ Quản lý).
- Thông báo trên chuông.

### GĐ 10: Hoàn thiện
- Kiểm tra giao diện desktop/laptop/iPad, dark mode; rà soát bảo mật; bổ sung test đạt độ phủ.
