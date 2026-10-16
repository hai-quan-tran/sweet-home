# Cấu trúc dự án & kỹ thuật

## Backend (`backend/`)
- Spring Boot 4.1, Java 25, Maven Wrapper; biên dịch/test bằng JDK 25 qua `maven-toolchains-plugin`.
- Package gốc `com.sweethome`. Chia theo chức năng (`common`, sau này `auth`, `room`, `order`, …).
  - `common.error`: `BusinessException` (lỗi nghiệp vụ có thông báo tiếng Việt + mã HTTP),
    `GlobalExceptionHandler` trả ProblemDetail; lỗi 400 kèm `errors` theo trường; lỗi 500 chỉ trả thông báo chung.
- API dưới context path `/api`.
- Cấu hình: `application.yml` (chung) + `application-dev.yml` (ghi thẳng kết nối) + `application-stage.yml`,
  `application-prod.yml` (biến môi trường `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT`). Profile mặc định: dev.
- Múi giờ Asia/Ho_Chi_Minh (JVM, Hibernate, Jackson). JPA `ddl-auto: validate`, schema do Liquibase quản lý.
- Liquibase: `db/changelog/db.changelog-master.yaml`, thêm changelog mới vào cuối danh sách.
- Test: JUnit 5 + Mockito (spring-boot-starter-test). JaCoCo kiểm tra độ phủ dòng ≥ 80% ở `mvn verify`
  (bỏ qua lớp `SweetHomeApplication`).

## Frontend (`frontend/`)
- Angular 21 (standalone, zoneless, signals), PrimeNG 21 + `@primeuix/themes` Aura, primeicons.
- `theme/sweet-home-preset.ts`: primary xanh dương; light dùng blue-600, dark dùng blue-400.
- Dark mode: class `app-dark` trên thẻ html (`darkModeSelector` của PrimeNG), `core/theme.service.ts`
  ghi nhớ lựa chọn trong localStorage (chỉ lựa chọn giao diện, không lưu token).
- `layout/shell`: menu trái (`layout/menu.ts`), thanh trên cùng, vùng nội dung; ≤ 1100px menu thành cột icon.
- Route tiếng Việt không dấu: `/tong-quan`, `/lich`, `/don-thue`, `/don-thue/tao-moi`, `/phong`, `/nhan-vien`,
  `/lich-lam`, `/cai-dat`. Màn chưa làm dùng `pages/placeholder`.
- Dev server: `proxy.conf.json` chuyển `/api` tới backend (cùng origin, thuận tiện cho cookie đăng nhập).
- Test: Vitest qua `ng test`.

## Cổng khi chạy dev
| Thành phần | Cổng |
|---|---|
| Backend | 8090 (8080 trên máy dev đã bị dự án khác dùng) |
| Frontend | 4200 |
| MySQL | 3306 (máy hiện tại) / 3307 (máy công ty cũ) — xem `dev-environment.md` |

## Đăng nhập & bảo mật (GĐ1, package `com.sweethome.auth`)
- JWT access token (30 phút) + refresh token ngẫu nhiên băm SHA-256 lưu DB (`refresh_token`, có cờ
  `remembered` để biết refresh lại bằng hạn 7 hay 30 ngày). Cả hai đặt trong cookie HttpOnly,
  `Path=/api`, `Secure` theo `app.cookie.secure` (dev: false vì chạy HTTP), `SameSite=Lax`.
- `SecurityConfig`: stateless, `JwtAuthenticationFilter` đọc cookie `access_token` dựng
  `Authentication` với principal là record `JwtService.AuthenticatedPrincipal` (accountId, username, role).
- CSRF kiểu double-submit cookie (`CookieCsrfTokenRepository`, `SpaCsrfTokenRequestHandler` theo
  khuyến nghị Spring cho SPA — ép ghi cookie ngay cả ở GET). **Phải set `cookiePath("/")` cho CSRF
  token repository** — mặc định Spring kế thừa context-path (`/api`), nhưng các route Angular sống
  ở `/`, `/tong-quan`, ... nên JS không đọc được `document.cookie` nếu để mặc định, dẫn tới thiếu
  header `X-XSRF-TOKEN` và mọi request POST/PUT/DELETE bị 403. (access_token/refresh_token thì
  ngược lại, đúng ý đồ khi để `Path=/api` vì chỉ cần trình duyệt tự gửi kèm XHR, JS không cần đọc.)
  `/auth/login`, `/auth/refresh`, `/auth/logout` bỏ qua kiểm tra CSRF (chưa có hoặc không cần cookie
  lúc đó); các endpoint khác (kể cả `/auth/change-password`) bắt buộc.
- Controller trả cookie bằng `response.addHeader(HttpHeaders.SET_COOKIE, ...)` qua
  `HttpServletResponse` được inject thẳng — **không dùng `ResponseEntity.header(...)`**, vì
  `HttpEntityMethodProcessor` ghi đè (put) toàn bộ giá trị "Set-Cookie" đã có, xoá mất cookie CSRF
  mà `CsrfFilter` vừa đặt trước đó trong cùng filter chain.
- Audit nền cho nhật ký: `common.audit.Auditable` (createdAt/By, updatedAt/By qua Spring Data JPA
  Auditing) + `AuditorAwareImpl` lấy username từ `Authentication`. **Không dùng `auth.getName()`**
  trực tiếp: vì principal là record (không phải `UserDetails`), `getName()` mặc định trả về
  `toString()` của cả record (dài, từng gây lỗi `Data truncation` ở cột `updated_by` VARCHAR(50)) —
  phải ép kiểu lấy `principal.username()`.
- Frontend `core/auth.service.ts` giữ `currentUser` dạng signal (không lưu token).
  `core/auth.interceptor.ts` tự gọi `/auth/refresh` khi gặp 401 rồi thử lại request gốc (dedupe
  refresh đồng thời qua `shareReplay`). **Không tự điều hướng `/dang-nhap` trong interceptor** —
  từng gây vòng lặp vô hạn vì chính route `/dang-nhap` cũng gọi `/auth/me` lúc vào (qua
  `guestGuard`), 401 lại kích hoạt điều hướng lại chính nó. Việc chuyển hướng khi chưa đăng nhập
  do các route guard (`core/auth.guard.ts`) đảm nhiệm, trả về `UrlTree`.
- Tài khoản Quản lý mặc định (`admin`, bắt đổi mật khẩu lần đầu) được `AuthDataSeeder` tạo tự động khi bảng `account`
  rỗng lúc khởi động. Mật khẩu ban đầu `app.admin.initial-password`: dev `Admin@123`, stage/prod `ADMIN_INITIAL_PASSWORD`
  (thiếu thì dừng khởi động) — từ GĐ10.1, trước đó cố định `Admin@123` ở mọi môi trường.

## Quy tắc audit (created/updated) cho các entity nghiệp vụ
- Mọi entity nghiệp vụ do người dùng tạo/sửa đều kế thừa `common.audit.Auditable`
  (createdAt, createdBy, updatedAt, updatedBy — tự ghi qua JPA Auditing). Áp dụng từ GĐ2 trở đi:
  hạng phòng, phòng (GĐ2), phụ thu (GĐ3), đơn thuê, thông tin homestay, mẫu tin nhắn (GĐ4),
  ca mẫu/ca xếp (GĐ8), v.v. Liquibase của mỗi bảng cần thêm 4 cột
  `created_at, created_by, updated_at, updated_by` (xem `001-auth.yaml` làm mẫu).
- Riêng đơn thuê: **chỉ dùng createdBy/updatedBy chung**, không thêm cột riêng cho từng mốc
  (ai nhận phòng, ai thu tiền, ai trả phòng, ai huỷ...). Lịch sử chi tiết từng thao tác theo mốc
  sẽ có đầy đủ ở GĐ7 (nhật ký thao tác, bảng riêng, có lọc) — đã xác nhận với người dùng, không
  cần làm sớm hơn.

## Phòng, hạng phòng, bảng giá (GĐ2, package `com.sweethome.room`)
- `RoomType` (tên + 4 mức giá) và `PricingSettings` (khung giờ chung: số giờ tối thiểu, giờ
  nhận/trả qua đêm và theo ngày — **chỉ 1 dòng**, id cố định `PricingSettings.SINGLETON_ID`).
  Dialog "Sửa bảng giá" sửa cả hai cùng lúc → 1 API `PUT /room-types/overview` (so sánh id trong
  danh sách gửi lên với DB để biết thêm/sửa/xoá hạng nào; chặn xoá hạng còn phòng).
- `Room`: giá theo hạng hoặc giá riêng (`pricingMode` + 4 cột `own*Price`, bắt buộc đủ cả 4 nếu
  chọn giá riêng — kiểm tra tay trong service vì là validate chéo field, không phải annotation
  đơn). `RoomDto` luôn trả thêm `effective*Price` (giá thật áp dụng) để frontend không phải tự
  tính theo `pricingMode`.
- Ảnh phòng (`RoomPhoto`) lưu trên đĩa qua `app.storage.room-photos-dir` (dev:
  `backend/data/room-photos`, gitignore), DB chỉ lưu tên file sinh ngẫu nhiên (UUID, không lưu
  tên gốc). Tải ảnh qua `GET /room-photos/{id}` (yêu cầu đăng nhập, cookie tự gửi kèm `<img>`
  nên không cần xử lý gì thêm ở frontend). Ảnh đầu (`sortOrder = 0`) là ảnh bìa.
- Phân quyền: xem (GET) cho mọi vai trò; thêm/sửa/bật-tắt/ảnh (`@PreAuthorize("hasRole('MANAGER')")`)
  chỉ Quản lý — đây là lần đầu dùng `@PreAuthorize` trong dự án nên gặp luôn 1 lỗi: `AccessDeniedException`
  do nó ném ra **không** tới được `AccessDeniedHandler` khai báo trong `SecurityConfig`, mà bị
  `GlobalExceptionHandler`'s catch-all `Exception.class` nuốt mất thành 500 (vì nó phát sinh lúc
  Spring MVC gọi method qua AOP proxy, được `ExceptionHandlerExceptionResolver` xử lý trước khi
  tới filter chain). Phải khai báo riêng `@ExceptionHandler(AccessDeniedException.class)` trả 403
  trong `GlobalExceptionHandler`. Áp dụng cho mọi phase sau có dùng `@PreAuthorize`.
- Frontend `RoomFormPage`: cờ "đã chọn hạng phòng" lấy từ `computed(() =>
  this.roomTypes().find(t => t.id === this.form.controls.roomTypeId.value))` **không tự chạy lại**
  khi người dùng đổi lựa chọn, vì `computed()` chỉ theo dõi đọc Signal, không theo dõi
  `FormControl.value` (một getter thường, không phải Signal). Phải đưa `valueChanges` qua
  `toSignal()` rồi mới `computed()` dựa trên signal đó. Lưu ý cho mọi form có logic phái sinh
  (computed) từ giá trị FormControl ở các phase sau.
- Trạng thái phòng (Trống/Đang ở/Chờ dọn...) chưa hiển thị ở GĐ2 vì phụ thuộc dữ liệu đơn thuê
  (GĐ4-5 mới có) — thẻ phòng tạm thời không có tag trạng thái, sẽ bổ sung khi làm vòng đời đơn.

## Phụ thu (GĐ3, package `com.sweethome.surcharge`)
- `Surcharge` (`whenType` cố định 1-1 với đơn vị tính, không cho chọn "cách thu" tự do — đã hỏi
  và chốt với người dùng để tránh cấu hình mơ hồ): `OVERSTAY` (không `amount`, chỉ `graceMinutes`,
  mặc định 15, mức thu lấy thẳng `extraHourPrice` của hạng phòng lúc tính) · `EXTRA_GUEST` (`amount`
  = đ/khách vượt) · `WEEKDAY` (`amount` = %, kèm `weekdays` qua `@ElementCollection`) · `DATE_RANGE`
  (`amount` = %, kèm `dateRanges` — con `SurchargeDateRange`, `@OneToMany(mappedBy)` cascade ALL +
  orphanRemoval, luôn thay toàn bộ danh sách khi sửa thay vì diff từng dòng) · `MANUAL` (`amount`
  = đ/lần, không tự cộng vào đơn, GĐ4 cho chọn tay lúc tạo/sửa đơn). `roomTypes` dùng chung cho mọi
  loại (`@ManyToMany` qua bảng `surcharge_room_type`). Xoá mềm qua `active` giống `RoomType`, nhưng
  **không chặn ẩn theo "còn áp dụng hiện hành"** như hạng phòng — chưa có gì tham chiếu phụ thu ở
  GĐ3 (đơn chưa tồn tại); sẽ cần xét lại điều kiện chặn khi GĐ4 nối đơn vào phụ thu. `OVERSTAY` và
  `EXTRA_GUEST` là "singleton": `SurchargeService` chặn tạo/khôi phục phụ thu thứ 2 cùng loại đang
  active (`rejectIfAnotherActiveSingletonExists`), vì mỗi điều kiện chỉ nên có đúng 1 cấu hình hệ
  thống; `WEEKDAY`/`DATE_RANGE`/`MANUAL` cho phép nhiều bản ghi.
- **Lỗi thật đã gặp và sửa**: `SurchargeDto.from()` lúc đầu trả thẳng `surcharge.getWeekdays()` —
  đây là `PersistentSet` do Hibernate quản lý (từ `@ElementCollection`), không phải `HashSet`
  thường. Vì `spring.jpa.open-in-view: false`, Session đóng ngay khi `SurchargeService.list()`
  (`@Transactional`) return, **trước khi** Jackson serialize response ở tầng servlet. Giữ nguyên
  tham chiếu `PersistentSet` trong DTO (dù dữ liệu đã nạp sẵn trong lúc map) làm Jackson lỗi lúc
  serialize, servlet trả 500 `"Failed to write request"` — không đi qua `GlobalExceptionHandler`
  nên log cũng không thấy stack trace, chỉ phát hiện được khi gọi API thật qua trình duyệt/curl
  (ca test tích hợp với `@Transactional` không bắt được, vì transaction bọc quanh test giữ Session
  mở xuyên suốt cả POST lẫn GET trong cùng 1 test, khác hành vi thật của 2 request riêng biệt).
  Đã sửa bằng cách copy ra `EnumSet`/`Set.of()` thường trước khi trả về DTO; thêm
  `SurchargeSerializationIntegrationTest` (cố ý **không** `@Transactional`, tự dọn dữ liệu ở
  `@AfterEach`) để bắt đúng lớp lỗi này — xác nhận test fail đúng khi bỏ fix, pass khi có fix.
  **Áp dụng cho mọi phase sau**: DTO dựng từ entity có `@ElementCollection`/`@ManyToMany`/
  `@OneToMany` lazy phải copy ra collection thường (`List.copyOf`, `new HashSet<>(...)`, hoặc
  `.stream()....toList()`), không trả thẳng field; muốn test bắt được lớp lỗi "chỉ lộ ra giữa 2
  request thật" thì test đó phải không dùng `@Transactional` bọc quanh class/method.
- Bộ tính phụ thu (`SurchargeCalculator`, hàm thuần không đụng DB, dễ unit test — xem
  `SurchargeCalculatorTest`): quá giờ — trễ ≤ ân hạn thì 0, quá ân hạn tính từ giờ trả phòng
  (không trừ phút ân hạn) rồi làm tròn lên giờ (`Math.ceilDiv`); theo ngày (WEEKDAY, DATE_RANGE) —
  với mỗi ngày khách ở, trong các phụ thu theo ngày khớp ngày đó chỉ lấy mức tiền cao nhất (không
  cộng dồn giữa chúng), rồi cộng dồn theo từng ngày khác nhau; quá giờ/vượt khách/thêm tay luôn
  cộng dồn độc lập với nhóm theo ngày. Chưa nối vào đơn thật (GĐ4 mới có đơn) — `SurchargeCalculationInput`
  nhận dữ liệu thuần (danh sách ngày kèm giá, giờ hẹn/thực trả, số khách vượt, id phụ thu thêm tay)
  để không phụ thuộc ngược vào entity Đơn chưa tồn tại.
- Frontend `SurchargeDialog`: dùng chung 1 form cho cả 5 loại, ẩn/hiện trường theo `whenType`
  (giống cấu trúc `data-when` của mock `design/PhuThu.html`) nhưng **bỏ hẳn phần chọn "Cách thu"**
  so với mock — nhất quán với quyết định cố định đơn vị tính theo loại ở backend. `weekdays` và
  `roomTypeIds` dùng `signal<Set<...>>` thay vì `FormArray` (đơn giản hơn cho checkbox rời rạc);
  `dateRanges` mới dùng `FormArray` vì là các dòng lặp lại giống dialog Sửa bảng giá.

## Mã hoá dữ liệu nhạy cảm (GĐ4, package `com.sweethome.common.crypto`)
- `CryptoService`: AES-256/GCM, khoá base64 đọc từ `app.crypto.secret` (`${CRYPTO_SECRET}` ở
  stage/prod, giá trị cố định ở `application-dev.yml` — cùng kiểu cấu hình với `app.jwt.secret`).
  Mỗi lần `encrypt()` sinh IV ngẫu nhiên riêng, ghép `IV + bản mã` rồi encode base64 thành 1 chuỗi
  lưu DB; `decrypt()` tách lại IV từ đầu chuỗi. Dùng cho CCCD và mã cửa của đơn thuê (xem
  `business-rules.md` mục "Xoá mềm & lưu lịch sử" — không liên quan, nhưng cùng chỗ nói về mã hoá).

## Đơn thuê & Cài đặt (GĐ4, package `com.sweethome.order`, `com.sweethome.settings`)
- `RentalOrder` (bảng `rental_order` — **không đặt tên bảng là `order`**, trùng từ khoá SQL):
  không có cột `code` riêng; mã đơn hiển thị ("SH-1036") dựng từ id lúc map DTO
  (`OrderDto.codeOf(id) = "SH-" + (1000 + id)`), đơn giản hơn một cột/sequence riêng. `status`
  mặc định `BOOKED`, GĐ4 không có đường nào đổi sang trạng thái khác (xem enum `OrderStatus` đủ 6
  giá trị cho GĐ5 dùng sau). CCCD lưu 2 cột: `guestIdNumberEncrypted` (AES, nguồn sự thật) +
  `guestIdNumberLast4` (plain, 4 ký tự cuối) — tách riêng để không phải giải mã mỗi lần hiển thị
  danh sách/chi tiết (chỉ cần che dạng "•••••••• 7302"). Mã cửa chỉ có `doorCodeEncrypted`, không
  có bản che sẵn vì luôn cần giá trị thật khi hiện/sao chép tin nhắn — giải mã qua
  `GET /orders/{id}/door-code` riêng, không trả trong `OrderDto` chung (tránh lộ khi chỉ cần xem
  danh sách). Snapshot giá + tên hạng phòng lúc tạo (4 cột `*Snapshot`), phụ thu áp dụng lúc tạo
  lưu con `OrderSurcharge` (tên + số tiền, không tham chiếu `Surcharge` gốc) — cùng nguyên tắc với
  snapshot của `Surcharge` dùng cho `SurchargeCalculator` ở GĐ3.
- Lịch nhận/trả tính theo `rentalType` (`OrderService.computeSchedule`, hàm riêng dễ test):
  `HOURLY` cần `checkInTime` + số giờ (≥ `minHours`, mặc định `minHours`); `OVERNIGHT` cố định theo
  `overnightCheckIn/Out` của `PricingSettings`, luôn đúng 1 đêm, không có ô số lượng; `DAILY` cần số
  ngày (mặc định 1), giờ nhận/trả cố định theo `dailyCheckIn/Out`. Kiểm tra trùng lịch qua
  `RentalOrderRepository.findOverlapping` (giao khoảng `[checkInAt, checkOutAt)`, loại trừ đơn
  `CANCELLED` dù GĐ4 chưa tạo được đơn huỷ — chuẩn bị sẵn cho GĐ5).
- Tính phụ thu lúc tạo đơn: lấy phụ thu `active` áp dụng cho đúng hạng phòng
  (`SurchargeRepository.findActiveByRoomTypeId`), build `SurchargeCalculationInput` với
  `scheduledCheckOut/actualCheckOut = null` (chưa trả phòng → phụ thu quá giờ luôn ra 0, đúng ý
  đồ) và `extraGuestCount = max(0, guestCount - room.maxGuests)`. `stayDays` cho `DAILY` là danh
  sách từng ngày kèm giá ngày đó (dùng `IntStream.range` sinh `LocalDate` liên tiếp); `HOURLY`/
  `OVERNIGHT` chỉ có 1 ngày — đúng input `SurchargeCalculator` đã thiết kế sẵn từ GĐ3.
- `POST /orders/preview`: cùng logic tính lịch/giá/phụ thu/trùng lịch như tạo đơn thật nhưng không
  lưu DB — dùng chung 1 hàm `computeSchedule` + `calculateSurcharges` ở service, tránh phải chép
  lại các quy tắc tính toán (vốn khá rối: GĐ2 giá theo hạng/giá riêng, GĐ3 phụ thu) sang frontend.
  Frontend gọi API này (debounce 300ms theo `form.valueChanges`) để tự cập nhật "Giờ trả (tự tính)"
  và tóm tắt tiền khi người dùng gõ form Tạo đơn — không tính tay ở Angular.
- `Settings` (`HomestayInfo` singleton giống `PricingSettings`; `MessageTemplate` không xoá mềm,
  xoá cứng vì không entity nào tham chiếu). Nội dung tin nhắn **không có endpoint backend để
  "render"** — ghép biến hoàn toàn ở frontend (`core/message-template.ts`), vì chỉ cần hiển thị
  tạm để sao chép, không lưu lại; biến `{huong_dan}` lấy `Room.checkInGuide` hiện hành qua
  `GET /rooms/{id}` lúc cần (không snapshot, khác các biến tiền/giá).
- Test có `OrderSerializationIntegrationTest` (không `@Transactional`, xem bài học ở mục Phụ thu
  phía trên) xác nhận `RentalOrder.surcharges` (`@OneToMany` lazy) không lặp lại lỗi 500 của GĐ3 —
  `OrderDto.from()` đã tự `.stream()....toList()` chuyển sang `List<OrderSurchargeDto>` phẳng trước
  khi trả, nên test này thực chất là test phòng ngừa (pass ngay từ đầu), không phải fix một lỗi
  mới phát hiện.
- Phạm vi cố ý cắt bớt ở GĐ4 (lý do và thứ tự phụ thuộc các phase sau): chưa ghi nhật ký xem mã
  cửa/sao chép tin nhắn (hạ tầng nhật ký là GĐ7); mã cửa không giới hạn theo "đang trong ca trực"
  (hạ tầng Lịch làm là GĐ8); đơn chỉ tạo & xem, chưa có sửa/huỷ/đổi trạng thái/thu tiền (GĐ5); phụ
  thu "thêm tay" chưa chọn được lúc tạo đơn (cần nơi thao tác theo mốc của đơn ở GĐ5).

## Thu tiền (GĐ5.1, package `com.sweethome.order`)
- Cọc vẫn lưu trên đơn (`deposit`, `depositMethod`) — bắt buộc khi tạo: `@Positive` + `@NotNull`
  ở `OrderUpsertRequest`, kiểm tra "không vượt tổng tiền" ở `OrderService.create` (cần tổng đã tính).
- Enum `DepositMethod` đổi tên thành `PaymentMethod`, dùng chung cho cọc và khoản thu (giá trị lưu DB
  không đổi: `TRANSFER`/`CASH`).
- Khoản thu thêm: `OrderPayment` (bảng `order_payment`, changelog `006-order-payment.yaml`), con của
  `RentalOrder` (`@OneToMany` cascade + orphanRemoval giống `OrderSurcharge`), kế thừa `Auditable` nên
  thời điểm thu/người thu lấy từ `createdAt/createdBy`, không thêm cột riêng.
  `RentalOrder.getPaidAmount()` = cọc + tổng khoản thu; `OrderDto` trả thêm `payments`, `paidAmount`,
  `dueAmount = max(0, total - paid)`.
- `OrderPaymentService` (tách khỏi `OrderService` cho gọn): thêm/sửa/xoá khoản thu; chặn đơn đã trả
  hoặc đã huỷ; chặn tổng đã thu vượt tổng tiền. Dùng `saveAndFlush` để DTO trả về có id/`createdAt`
  của khoản vừa thêm.
- API: `POST /orders/{id}/payments` (mọi vai trò), `PUT|DELETE /orders/{id}/payments/{paymentId}`
  (`@PreAuthorize` MANAGER). Trả về `OrderDto` đầy đủ để frontend thay luôn đơn đang xem.
- Frontend: chi tiết đơn (màn Đơn thuê) hiện từng khoản thu (giờ, hình thức, người thu), Đã thu, Còn
  phải thu; nút "Thu tiền" mở form ngay trong khung chi tiết (mặc định số còn phải thu); Quản lý có
  nút sửa/xoá từng khoản (xoá hỏi lại bằng `confirm`). Màn Tạo đơn: tiền cọc bắt buộc, báo lỗi ngay
  khi cọc vượt tổng tiền xem trước.

## Nhận phòng & tự chuyển trạng thái (GĐ5.2)
- `common.time.TimeConfig`: bean `Clock` (giờ Việt Nam) + `@EnableScheduling`. Service nghiệp vụ cần
  "bây giờ" thì inject `Clock` (test dùng `Clock.fixed`), không gọi `LocalDateTime.now()` trực tiếp.
- `OrderLifecycleService` (vòng đời đơn, 5.3–5.4 sẽ thêm trả phòng/huỷ vào đây):
  - `checkIn`: chỉ đơn `BOOKED`, ghi `actualCheckInAt` = bây giờ (cột mới, changelog `007-order-lifecycle.yaml`).
  - `advanceStatuses`: `OrderStatusScheduler` gọi mỗi phút. Lấy đơn tới mốc qua
    `RentalOrderRepository.findDueForAutoTransition`, rồi áp hàm thuần `advance(order, now)`:
    tự check-in `BOOKED → CHECKED_IN` (giờ nhận thực tế = giờ hẹn) → `PENDING_CHECKOUT` khi tới giờ
    trả (có thể qua 2 bước trong 1 lần nếu đã trễ cả giờ trả); NV đón chỉ `CHECKED_IN → OVERSTAY`.
    Sửa qua entity (không bulk update) để Auditing ghi `updatedBy = system`.
- API `POST /orders/{id}/check-in` (mọi vai trò). Frontend: nút "Nhận phòng" (hỏi lại) ở chi tiết đơn
  Đã đặt, hiện "Nhận thực tế"; danh sách tự tải lại sau thao tác.

## Trả phòng & phòng chờ dọn (GĐ5.3)
- `OrderLifecycleService.previewCheckout` / `checkout` (đơn `CHECKED_IN`, `OVERSTAY`, `PENDING_CHECKOUT`):
  gọi lại `SurchargeCalculator` với `stayDays` rỗng (phụ thu theo ngày đã cộng lúc tạo), giá mỗi giờ
  thêm lấy **snapshot** của đơn, giờ hẹn trả = `checkOutAt`, giờ trả = giờ thực tế nhập vào → chỉ ra
  phụ thu quá giờ + thêm tay đã chọn. Tổng mới = tổng cũ + phụ thu mới (trả sớm không giảm).
  Preview trả kèm `manualOptions` (phụ thu thêm tay áp dụng cho hạng phòng) để frontend không phải tự lọc.
- Xác nhận trả: lưu `actualCheckInAt/actualCheckOutAt`, thêm dòng `OrderSurcharge` mới
  (`RentalOrder.addSurcharge`), cập nhật tổng, tự thêm `OrderPayment` cho số còn lại (ghi chú "Thu
  khi trả phòng", bắt buộc chọn hình thức khi còn phải thu), status `CHECKED_OUT`, `room.needsCleaning = true`.
- `Room.needsCleaning` (cột `BIT` — **cột boolean trong dự án luôn khai `type: BIT`** ở Liquibase,
  `BOOLEAN` ra `tinyint` làm Hibernate validate lỗi). `POST /rooms/{id}/cleaned` (mọi vai trò) → Trống.
- API: `POST /orders/{id}/checkout/preview`, `POST /orders/{id}/checkout` (mọi vai trò).
- Frontend: nút "Trả phòng" / "Xác nhận trả phòng" (đơn Chờ xác nhận trả) mở form trong chi tiết
  đơn: 2 ô datetime-local (mặc định giờ nhận thực tế; giờ trả = giờ hẹn nếu khách tự trả, còn lại =
  bây giờ), tick phụ thu thêm tay, tóm tắt tiền gọi preview mỗi lần đổi; màn Phòng hiện tag "Chờ dọn"
  + nút "Đã dọn".

## Huỷ đơn (GĐ5.4)
- `OrderLifecycleService.previewCancel` / `cancel`; hàm thuần `refundPercent(checkInAt, cancelAt)`
  (≥ 24 giờ trước giờ nhận → 100, trước giờ nhận → 50, còn lại → 0), mức hoàn = cọc × %.
- Quyền xét trong service (cần dữ liệu đơn nên không dùng `@PreAuthorize`): controller lấy vai trò từ
  `@AuthenticationPrincipal JwtService.AuthenticatedPrincipal` truyền cờ `manager`. Nhân viên: chỉ
  đơn chưa có khoản thu ngoài cọc, không sửa số hoàn (403). Số hoàn khác mặc định → bắt buộc lý do;
  không vượt đã thu.
- Lưu `cancelledAt`, `refundAmount`, `cancelReason` trên đơn (changeset `007-order-cancel`). Đơn huỷ
  bị loại khỏi kiểm tra trùng lịch (đã có từ GĐ4) nên khung giờ trống lại ngay.
- API: `GET /orders/{id}/cancel/preview`, `POST /orders/{id}/cancel`.
- Frontend: nút "Huỷ đơn" (ẩn với NV khi đơn đã thu ngoài cọc), form hiện mức hoàn tự tính, ô số hoàn
  chỉ Quản lý sửa được, lý do; xác nhận bằng `confirm`; đơn huỷ hiện mục "Đã huỷ" (lúc, số hoàn, lý do).

## Sửa đơn (GĐ5.5)
- `OrderService.update` dùng chung hàm `fill` với `create` (lịch, giá snapshot theo bảng giá hiện hành,
  phụ thu, tổng, cọc ≤ tổng). Kiểm tra trùng lịch qua `conflictMessage(room, schedule, excludeOrderId)`
  bỏ qua chính đơn đang sửa; `POST /orders/preview` nhận thêm `excludeOrderId` cho cùng mục đích.
- Chỉ đơn `BOOKED`; mã cửa/CCCD để trống = giữ giá trị cũ; NV đổi cọc → 403; chuyển sang phòng đang
  tắt nhận đặt bị chặn (giữ nguyên phòng cũ thì được); tổng mới < đã thu bị chặn.
- API `PUT /orders/{id}` (vai trò lấy từ `@AuthenticationPrincipal`, như huỷ đơn).
- Frontend: `OrderFormPage` dùng chung cho route `/don-thue/:id/sua` (nạp đơn + danh sách phòng bằng
  `forkJoin`, đặt loại thuê/phòng trước rồi `patchValue` phần còn lại vì 2 ô này có `valueChanges` tự
  đặt lại số lượng/hình thức check-in); NV bị `disable()` ô cọc. Nút "Sửa đơn" ở chi tiết đơn Đã đặt.
- **Lưu ý đặt tên**: getter/setter cọc của `RentalOrder` là `getDepositMethod/setDepositMethod` (kiểu
  `PaymentMethod`). Lần đổi tên enum bằng `sed` ở 5.1 từng đổi nhầm thành `getPaymentMethod`, đã sửa
  lại ở 5.5 — khi đổi tên hàng loạt cần giới hạn theo từ nguyên (`\bDepositMethod\b`).

## Chặng của đơn (GĐ6.1)
- `OrderStay` (bảng `order_stay`, changelog `008-order-stay.yaml`): phòng + `startAt`/`endAt`, con của
  `RentalOrder` (`@OneToMany` cascade + orphanRemoval, sắp theo `startAt`). Đơn thường 1 chặng; gia
  hạn phải chuyển phòng (6.4) thêm chặng mới. Changelog tự tạo 1 chặng cho mỗi đơn có sẵn.
- `RentalOrder` vẫn giữ `room` (phòng hiện tại = chặng cuối), `checkInAt` (đầu chặng đầu),
  `checkOutAt` (cuối chặng cuối) để các truy vấn/màn cũ không đổi. Tạo/sửa đơn đặt lịch qua
  `scheduleSingleStay(room, in, out)` để 3 cột này và chặng luôn khớp — không gọi riêng
  `setRoom/setCheckInAt/setCheckOutAt` trong code nghiệp vụ (chỉ test dùng).
- Kiểm tra trùng lịch (`RentalOrderRepository.findOverlapping`) xét theo chặng ở phòng đó
  (`exists` trên `OrderStay`), không theo `room/checkInAt/checkOutAt` của đơn.

## Lịch đặt phòng (GĐ6.2)
- API `GET /orders/stays?from=…&to=…` (giờ dạng `2026-10-07T00:00:00`, khoảng ≤ 31 ngày): các chặng
  của đơn chưa huỷ giao với khoảng, `join fetch` đơn, trả `OrderStayDto` phẳng (mã đơn, phòng, trạng
  thái, khách, giờ chặng). Danh sách phòng lấy từ `GET /rooms` có sẵn.
- Frontend `pages/calendar/calendar-page`: 3 kiểu xem (ngày 24 cột giờ 00–23, tuần từ thứ Hai, tháng
  theo số ngày), vị trí khối = % trong khoảng đang xem (tính ở frontend, không cần backend chia ô).
  Khối cắt ở mép có góc vuông (`cont-l/cont-r`), đơn Quá giờ có phần nét đứt đến bây giờ, vạch "bây
  giờ"; tự tải lại mỗi phút. Cột phòng `position: sticky` khi cuộn ngang; vào màn/đổi khoảng tự cuộn
  tới giờ hiện tại. Bấm ô trống → `/don-thue/tao-moi?roomId=&date=&time=` (xem theo ngày mới có giờ
  tròn), Tạo đơn đọc query param điền sẵn; phòng tắt nhận đặt không bấm được.
- Chi tiết đơn tách thành component dùng chung `pages/orders/order-detail` (input `orderId`,
  `autoCopy`; output `changed` sau nhận/trả phòng, huỷ để màn cha tải lại). Màn Đơn thuê đặt ở cột
  phải; màn Lịch đặt dưới timeline (không thu hẹp lịch) — component dùng container query: khung
  ≥ 900px chia các mục thành 3 cột.
- Style dùng chung chuyển lên `styles.scss` (nút `.btn-p/.btn-s`, `.card`, `.tag` + `.t-*` có màu
  riêng cho dark mode, `.sel/.inp`, `.muted/.num/.hint`); nhãn trạng thái/loại thuê ở
  `core/order-labels.ts`. Màn mới dùng lại, không chép style vào từng component.

## Gia hạn tại phòng (GĐ6.3)
- `OrderExtensionService` (tách khỏi `OrderLifecycleService`, 6.4 thêm chuyển phòng vào đây). Đơn
  Đang ở / Quá giờ / Chờ xác nhận trả; thêm giờ = giá mỗi giờ thêm, thêm ngày = giá ngày, đều lấy
  **snapshot của đơn** (cùng nguyên tắc phụ thu quá giờ ở 5.3). Đơn kế tiếp tìm qua
  `RentalOrderRepository.findStaysStartingFrom` (chặng đầu tiên ở phòng đó từ giờ trả hiện tại trở đi);
  giờ trả mới phải ≤ giờ nhận của chặng đó − 1 tiếng (`GAP_BEFORE_NEXT`), không thì 409.
- Xác nhận: `RentalOrder.extendTo` dời `checkOutAt` + `endAt` chặng cuối; thêm dòng `OrderSurcharge`
  "Gia hạn +N giờ/ngày" (quyết định với người dùng: dòng riêng, không cộng vào tiền phòng); thu ngay thì
  thêm `OrderPayment` ghi chú "Thu khi gia hạn"; trạng thái về `CHECKED_IN` (tác vụ mỗi phút tự chuyển
  lại nếu giờ trả mới vẫn đã qua). Phụ thu quá giờ khi trả phòng tính từ giờ trả mới.
- API `POST /orders/{id}/extend/preview`, `POST /orders/{id}/extend` (mọi vai trò). Preview trả giá
  giờ/ngày, giờ trả mới, phí, đơn kế tiếp, `maxCheckOutAt`, `maxExtraHours` (để gợi ý "Đổi sang thêm
  N giờ"), `available`.
- **Lưu ý Jackson 3** (Spring Boot 4): mặc định báo lỗi 400 khi request thiếu trường kiểu nguyên thuỷ
  (`FAIL_ON_NULL_FOR_PRIMITIVES` bật sẵn) — `ExtendRequest.collectNow` (`boolean`) phải luôn gửi.
  Trường không bắt buộc nên khai báo kiểu đối tượng (`Boolean`, `Long`…).
- Frontend `pages/orders/extend-dialog` (p-dialog, `visible` dùng `model()`): mỗi lần đổi kiểu/số
  lượng gọi preview, không tự tính ở Angular. Mở từ nút "Gia hạn" trong `OrderDetail` (đơn đang ở),
  nên có ở cả màn Đơn thuê và Lịch. Chưa vẽ thanh thời gian minh hoạ như bản thiết kế (chỉ các ô
  thông tin + cảnh báo giới hạn).

## Chuyển phòng khi gia hạn (GĐ6.4)
- Preview gia hạn không giữ được phòng thì trả thêm `moveOptions`: phòng khác, `Room.effectivePrices()`
  bằng phòng đang ở (so cả 4 mức), `acceptingBookings`, `!needsCleaning`, `findOverlapping` rỗng trong
  `[giờ trả hiện tại, giờ trả mới + 1 tiếng)`; kèm `freeUntil` (chặng kế tiếp ở phòng đó).
- `ExtendRequest.targetRoomId`: bắt buộc khi không giữ được phòng, phải nằm trong `moveOptions` (409
  nếu không). `RentalOrder.moveTo` thêm chặng mới và đổi `room`/`checkOutAt` của đơn sang phòng mới
  (đơn luôn trỏ phòng hiện tại = chặng cuối). Giá không đổi vì cùng giá.
- Phòng cũ Chờ dọn: cột `order_stay.cleaning_requested` (changelog `009-order-stay-release.yaml`).
  `OrderStatusScheduler` mỗi phút gọi thêm `OrderExtensionService.releaseMovedOutRooms`: chặng không
  phải chặng cuối, đã kết thúc, chưa đánh dấu → `room.needsCleaning = true` một lần (không bật lại sau
  khi đã bấm "Đã dọn").
- `OrderDto.stays` (record `Stay`: số/tên phòng, giờ) — chi tiết đơn hiện mục "Các chặng" khi > 1.
  Màn Lịch không cần sửa gì: chặng ở phòng nào hiện ở dòng phòng đó.
- Frontend dialog Gia hạn: chọn sẵn phòng đầu tiên trong `moveOptions`, nhãn nút "Chuyển sang 202 & gia
  hạn đến …"; không có phòng thì hộp "Không có phòng phù hợp" + gợi ý đổi sang thêm giờ (nếu còn giờ).
- Test JSON path lọc nhiều phần tử (`$[?(...)].x`) phải so bằng Hamcrest `contains(...)`: `.value(List.of(...))`
  của Spring báo "but was: null" dù dữ liệu đúng.

## Tài khoản nhân viên (GĐ7.1, package `com.sweethome.staff`)
- `Account` thêm `phone`, `idNumberEncrypted` + `idNumberLast4` (CCCD mã hoá AES, cùng cách lưu với CCCD
  khách của đơn), `startDate` (changelog `010-account-profile.yaml`). Entity vẫn ở package `auth`;
  `staff` chỉ có API/service quản lý.
- API `/accounts`: `GET` danh sách / `GET /{id}` (mọi vai trò — NV được xem danh sách nhân viên),
  `POST`, `PUT /{id}` (`@PreAuthorize` MANAGER). Một request `AccountUpsertRequest` dùng chung thêm/sửa:
  sửa thì bỏ qua `username` (không đổi được — audit `createdBy/updatedBy` và nhật ký ghi theo tên đăng
  nhập), `password`/`idNumber` để trống = giữ cũ; khoá/mở và đặt lại mật khẩu tạm đều qua `PUT`
  (`active`, `password`) thay vì endpoint riêng. Đặt lại mật khẩu hoặc khoá → thu hồi mọi refresh token.
  Quản lý không tự khoá / tự đổi vai trò chính mình (400) → luôn còn ít nhất 1 Quản lý hoạt động.
- **Khoá / đổi vai trò có hiệu lực ngay**: `JwtAuthenticationFilter` nạp lại `Account` theo id trong
  token mỗi request (1 truy vấn theo khoá chính), bỏ qua tài khoản `LOCKED`, lấy vai trò từ DB chứ không
  tin claim `role` trong JWT. Access token còn hạn của tài khoản bị khoá trả 401 ngay.
- Frontend `pages/staff`: `StaffPage` (danh sách tài khoản + quyền của Nhân viên; Quản lý bấm vào dòng
  để sửa), `StaffFormPage` (route `/nhan-vien/them`, `/nhan-vien/:id/sua`, `managerGuard`) dùng lại
  style form của Thêm phòng (`styleUrls` trỏ `../rooms/room-form-page.scss`) + phần riêng; nút "Tạo ngẫu
  nhiên" sinh mật khẩu bằng `crypto.getRandomValues`. Danh sách quyền ở `staff-permissions.ts`, style
  `.perm` dùng chung đặt ở `styles.scss`. `managerGuard` chặn thì về màn cha (đoạn đầu URL).

## Nhật ký thao tác (GĐ7.2, package `com.sweethome.activity`)
- Bảng `activity_log` (changelog `011-activity-log.yaml`): `created_at`, `actor` (tên đăng nhập, lấy qua
  `AuditorAware` giống cột audit — tác vụ nền là `system`), `action` (enum `ActivityAction`, để lọc/truy
  vấn), `detail` (câu hiển thị tiếng Việt, tối đa 255 ký tự, cắt nếu dài hơn), `order_id`, `room_number`
  (chuỗi, giữ đúng phòng lúc thao tác). Không kế thừa `Auditable`; chỉ thêm, không sửa/xoá.
- `ActivityLogService.log(action, orderId, roomNumber, detail)` gọi trong cùng transaction của thao tác
  nghiệp vụ (lỗi → rollback cả dòng nhật ký). Nơi gọi: `OrderService` (tạo, sửa, mã cửa),
  `OrderLifecycleService` (nhận/trả phòng, huỷ, tự chuyển trạng thái), `OrderPaymentService` (thu/sửa/xoá),
  `OrderExtensionService` (gia hạn, chuyển phòng), `RoomService.markCleaned`, `AccountManagementService`
  (thêm; sửa ghi kèm khoá/mở, đổi vai trò, đặt lại mật khẩu). Tiền định dạng `ActivityLogService.money`
  ("300.000đ"); nhãn tiếng Việt ở `PaymentMethod.label()` và `OrderStatus.label()`.
- Mã cửa: `GET /orders/{id}/door-code?forMessage=true` ghi `DOOR_CODE_COPIED` ("Sao chép tin nhắn có mã
  cửa"), không có tham số thì ghi `DOOR_CODE_VIEWED`. Vì có ghi DB nên `getDoorCode` là `@Transactional`
  thường (không `readOnly`). Frontend `OrderDetail.copyMessage` với mẫu có `{ma_cua}` luôn gọi lại API kèm
  `forMessage` (kể cả khi đã bấm Hiện) — GĐ9 dựa vào `DOOR_CODE_COPIED` để biết đơn "đã gửi mã" (đã có
  index `order_id, action`).
- API `GET /activity-logs?from=…&actor=…&page=…&size=…` (`@PreAuthorize` MANAGER; mới nhất trước; size
  tối đa 100). DTO kèm `actorName` (họ tên hiện tại, tra từ `account`) và `orderCode`.
- Frontend: card "Nhật ký thao tác" ở `StaffPage` chỉ với Quản lý (lưới: nhật ký bên trái, tài khoản +
  quyền bên phải; ≤ 1100px xếp dọc). Lọc Hôm nay / 7 ngày / Tháng này (`periodStart` trong
  `core/activity-log.service.ts` tính mốc giờ địa phương) và theo người (+ "Hệ thống"); "Xem thêm" nối
  trang kế tiếp; mã đơn link tới `/don-thue?id=`.
- **Test không `@Transactional`** (`OrderSerializationIntegrationTest`) tạo đơn thật nên sinh dòng nhật
  ký thật — phần `@AfterEach` phải xoá `activity_log` theo `order_id` (qua `JdbcTemplate`), không thì rác
  lại trong DB dev. Áp dụng cho test tương tự ở các phase sau.

## Lịch làm: ca mẫu & xếp ca (GĐ8.1, package `com.sweethome.schedule`)
- Bảng `shift_template` (tên, giờ bắt đầu/kết thúc `TIME`, màu 1–6; changelog `012-schedule.yaml` tạo sẵn
  Sáng 06–14, Chiều 14–22, Đêm 22–06) và `work_shift` (`account_id`, `template_id` null = ca lẻ, bản sao
  `name`/`color` (0 = ca lẻ), `start_at`/`end_at` `DATETIME`, `edited`, `note`). Cả hai kế thừa `Auditable`.
  `WorkShift` giữ id thô (`accountId`, `templateId`), không `@ManyToOne` — không cần nạp lazy.
- Giờ kết thúc ≤ giờ bắt đầu = hôm sau (`ScheduleService.endOf`; bằng nhau → 400). Ca thuộc ngày của
  `start_at`. `edited` tính lúc lưu (giờ khác ca mẫu lúc đó) — không so lại với mẫu hiện hành, vì sửa mẫu
  sau đó không được làm ca cũ hiện "đã sửa".
- Chặn trùng giờ cùng tài khoản: `WorkShiftRepository.existsOverlap` (giao `[start, end)`, bỏ qua chính ca
  đang sửa). Tài khoản khoá hoặc trước `startDate` → 400. Xoá ca mẫu: `detachTemplate` (update
  `template_id = null`, `clearAutomatically`) rồi mới xoá — FK `ON DELETE SET NULL` chỉ là lớp dự phòng ở
  DB, không cập nhật entity đang nằm trong persistence context.
- Sao chép tuần trước (`POST /shifts/copy-week`, `weekStart` phải là thứ Hai): chép ca có ngày trong tuần
  trước sang +7 ngày, bỏ qua (đếm `skipped`) ca của tài khoản khoá/chưa tới ngày làm/trùng giờ.
- API: `GET /shift-templates`, `GET /shifts?from=YYYY-MM-DD&to=…` (ngày của ca trong `[from, to)`, ≤ 31
  ngày) cho mọi vai trò; `POST/PUT/DELETE` ca mẫu, ca, sao chép tuần chỉ Quản lý.
- Frontend `pages/schedule/schedule-page` (route `/lich-lam`): bảng người (tài khoản đang hoạt động) × 7
  ngày, tổng giờ/tuần, cột hôm nay tô nền; bấm ca / ô "+" mở card "Sửa ca / Thêm ca" bên dưới (chọn mẫu tự
  điền giờ, gợi ý "Đã sửa · ca mẫu …", "Đặt lại theo mẫu", "Thêm ca khác trong ngày", "Xoá ca"); card Ca
  mẫu sửa/thêm/xoá ngay trong card (màu mới mặc định màu chưa dùng). Màu ca `.s0`–`.s6` trong scss của màn,
  dark mode qua `:host-context(.app-dark)`. Nhân viên: không có nút thêm/sao chép, ca `disabled`.

## Độ phủ ca & ràng buộc theo ca (GĐ8.2)
- `ScheduleService.coverage(from, to)` / `GET /shifts/coverage` (chỉ Quản lý): đơn chưa huỷ, hình thức
  `STAFF`, giờ nhận trong khoảng (`RentalOrderRepository.findStaffPickupsBetween`, `join fetch room`);
  "không ai trực" = giờ nhận không nằm trong `[start, end)` của ca nào thuộc tài khoản đang hoạt động. Trả
  số đơn / số đơn thiếu theo ngày + danh sách đơn thiếu. GĐ9 (thông báo "không ai trực") dùng lại hàm này.
- Mã cửa cho Nhân viên: `OrderService.getDoorCode(id, forMessage, staffAccountId)` — controller truyền
  `null` nếu Quản lý; Nhân viên phải qua `ScheduleService.canSeeDoorCode`: đang trong ca (ca giao
  `[now, now+1s)`) hoặc thời gian ở của đơn giao với một ca của mình (`existsForAccountBetween`), không thì
  403 (không ghi nhật ký). Frontend `OrderDetail` hiện lý do ở nút Hiện (`actionError`) và khi sao chép
  (`copyFeedback`), không kẹt trạng thái đang tải.
- Màn Lịch làm (Quản lý): dòng "Đơn cần NV đón" cuối bảng ("4 · đủ" / "3 · thiếu 1") và hộp cảnh báo cho
  từng đơn thiếu người có giờ nhận từ bây giờ trở đi, nút "Xem đơn".
- Màn Nhân viên: tag "Đang trong ca" / "Vào ca HH:mm" (ca kế tiếp trong hôm nay) tính ở frontend từ
  `GET /shifts` hôm qua → hết hôm nay (ca đêm hôm qua có thể kéo sang hôm nay). Thứ tự tag: Đã khoá → tag ca
  → Quản lý.
- `ScheduleService` phụ thuộc `RentalOrderRepository` và `OrderService` phụ thuộc `ScheduleService` (không
  vòng bean vì Schedule chỉ dùng repository của đơn).
- "Cần người": `CoverageDto.needs` = các cặp (ngày, ca mẫu) mà khung giờ ca mẫu của ngày đó chứa giờ nhận
  phòng của một đơn không ai trực (`ScheduleService.neededTemplates` xét ngày của giờ nhận và ngày trước đó —
  ca đêm hôm trước kéo sang sáng nay; chỉ lấy ngày trong khoảng đang xem). Frontend: ô của người chưa có ca
  ngày đó đổi nút "+" thành "Cần người · Ca …" (viền cam), bấm → `openNew(account, ngày, templateId)`.
  Dòng "Đơn cần NV đón" đếm theo ngày nhận phòng, còn "Cần người" theo ngày của ca (đơn 02:00 ngày 16 báo
  thiếu ở cột 16 nhưng "Cần người · Ca đêm" ở cột 15) — người dùng chọn giữ vậy và để hộp cảnh báo nêu rõ ca
  cần xếp: mỗi `UncoveredOrder` có `needs` riêng, cảnh báo ghi "… — cần xếp ca đêm Thứ Năm 15/10".

## Tổng quan (GĐ9.1, package `com.sweethome.dashboard`)
- `DashboardService.overview(manager)` / `GET /dashboard` (mọi vai trò; controller lấy vai trò từ
  `@AuthenticationPrincipal`, `revenue` = null với Nhân viên — ẩn ở backend, không chỉ ẩn ở giao diện). Một API tổng
  hợp cả màn: người đang trong ca, thẻ phòng, lượt nhận hôm nay, việc cần làm, doanh thu 7 ngày, số đơn tháng theo loại
  thuê (`EnumMap`, đủ 3 khoá), công suất. `now` cắt phần lẻ giây (Safari không đọc chuỗi giờ 7 chữ số thập phân).
- Truy vấn mới ở `RentalOrderRepository`: `findStaying` (Đang ở/Quá giờ/Chờ xác nhận trả), `findBookedStaysEndingAfter`
  (khách kế tiếp từng phòng + lượt nhận hôm nay), `findCheckingInBetween` (gồm đơn huỷ — doanh thu, cơ cấu đơn).
  `ActivityLogRepository.findOrderIdsWithAction` biết đơn nào đã gửi mã (`DOOR_CODE_COPIED`); chỉ gọi khi danh sách id
  không rỗng.
- Phòng của đơn đang ở = chặng mới nhất đã bắt đầu (`DashboardService.currentRoom`), không dùng `order.room` — đơn vừa
  gia hạn chuyển phòng vẫn ở phòng cũ cho tới khi chặng cũ kết thúc. Có đơn đang ở thì lấy trạng thái đơn, không thì
  Chờ dọn (`needsCleaning`) / Trống.
- Việc nhận/trả của đơn nhân viên đón kèm người trực lúc đó (ca của tài khoản đang hoạt động chứa giờ đó).
- Frontend `pages/dashboard/dashboard-page` (route `/tong-quan`, bỏ `PlaceholderPage` vì không còn màn trống): mọi chữ/
  phần trăm tính bằng `computed` từ một `DashboardDto`, giờ tương đối ("còn 50 phút", "Quá giờ 25 phút") tính theo `now`
  của server; tự tải lại mỗi phút. Nhân viên: 3 chỉ số, không có biểu đồ doanh thu (card cơ cấu đơn chiếm hết hàng).
- Nút xử lý nhanh mở `/don-thue?id=…&action=copy|checkout|extend`. `OrderDetail.autoAction` (thay `autoCopy`): `copy` sao
  chép tin nhắn, `checkout` mở form trả phòng, `extend` mở dialog gia hạn (2 hành động sau chỉ khi đơn đang ở). Tạo đơn
  "Lưu & sao chép" cũng dùng `action=copy`. `OrdersPage` theo dõi `queryParamMap` (không chỉ snapshot) để bấm link khi
  đang ở màn Đơn thuê vẫn mở đúng đơn.
- Test tay qua API với dữ liệu thật: **dữ liệu thử để lại trong DB dev làm test tích hợp "thay toàn bộ bảng giá" lỗi 409**
  (hạng phòng còn phòng dùng) — thử xong phải xoá sạch (phòng, hạng phòng, đơn + bảng con, nhật ký).

## Thông báo (GĐ9.2)
- `DashboardService.notifications(manager)` / `GET /notifications`: quá giờ + chờ xác nhận trả (`findStaying`), đơn khách
  tự check-in nhận phòng trong `[bây giờ, +2 giờ]` chưa có `DOOR_CODE_COPIED`, và (chỉ Quản lý) đơn không ai trực có giờ
  nhận trong 7 ngày tới — dùng lại `ScheduleService.coverage(hôm nay, +8 ngày)` rồi lọc theo giờ. Sắp theo loại (thứ tự
  enum `NotificationDto.Kind`) rồi theo giờ; trả kèm `now` để frontend tính "quá giờ 25 phút", "còn 1 giờ 20 phút".
- Frontend: `core/notification.service.ts` (`describeNotification` — hàm thuần dựng tiêu đề, mô tả, nút xử lý nhanh);
  `Shell` hỏi lại mỗi phút (`interval` + `startWith(0)`, lỗi một lần bỏ qua bằng `catchError(() => EMPTY)` để không dừng
  việc hỏi lại), mở bảng thì tải lại ngay; bảng tự làm (không dùng PrimeNG Popover) theo `design/notify.css`, đóng khi bấm
  ra ngoài / Esc qua `@HostListener('document:click' | 'document:keydown.escape')`.
- Nút xử lý nhanh: Trả phòng / Xác nhận trả phòng (`action=checkout`), Gia hạn (`extend`), Sao chép tin nhắn (`copy`),
  Mở lịch làm (`/lich-lam?date=YYYY-MM-DD` — `SchedulePage` theo dõi `queryParamMap`, mở tuần chứa ngày đó).
- Hàm định dạng giờ dùng chung (`hm`, `dm`, `timeOf`, `minutesBetween`, `durationLabel`, tên thứ) ở `core/time-format.ts`.

## Rà soát bảo mật (GĐ10.1)
- Ảnh phòng: `RoomPhotoStorageService.imageExtension` nhận diện loại theo byte đầu file (JPG/PNG/WebP), đặt đuôi file theo
  loại thật — không tin tên file/content-type trình duyệt gửi (từng có thể lưu `x.html` khai báo `image/png` rồi trả về
  dạng HTML cùng origin = XSS). Đọc ảnh: content-type theo bảng đuôi cố định, đuôi lạ trả `application/octet-stream`.
- Đăng nhập (`AuthService.login`): tên không tồn tại vẫn so một hash giả (thời gian trả lời như nhau); khoá tạm 5 lần sai /
  15 phút qua cột `account.failed_login_count`, `login_locked_until` (changelog `013-login-lockout.yaml`), lỗi 429.
  **`@Transactional(noRollbackFor = BusinessException.class)`** — không có thì lỗi đăng nhập rollback luôn số lần sai.
  Ghi số lần sai bằng `AccountRepository.updateLoginFailures` (update thẳng, không đổi `updated_at/by`). Test
  `LoginLockoutIntegrationTest` cố ý không `@Transactional` (transaction bọc test dùng chung session nên không bắt được lỗi
  rollback), đã xác nhận fail khi bỏ `noRollbackFor`. Màn Đăng nhập hiện `detail` của server thay vì một câu cố định.
- `GET /orders`: `size` tối đa 100 (`OrderService.MAX_PAGE_SIZE`), giống nhật ký.
- `SweetHomeApplication` loại `UserDetailsServiceAutoConfiguration` (Spring tự tạo user nhớ tạm + in mật khẩu ra log).
- Đã rà và giữ nguyên: mọi API sửa cấu hình/nhân viên/lịch làm/nhật ký có `@PreAuthorize` MANAGER, phần còn lại đúng quyền
  Nhân viên theo business-rules; JPQL dùng tham số; lỗi 500 không trả chi tiết; frontend không dùng `innerHTML`.
- **Ghi file .md bằng `node -e "..."` trong bash làm mất mọi đoạn trong dấu backtick** (shell hiểu là lệnh) — dùng heredoc
  `<<'EOF'` hoặc công cụ sửa file.
