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
- Tài khoản Quản lý mặc định (`admin` / `Admin@123`, bắt đổi mật khẩu lần đầu) được
  `AuthDataSeeder` tạo tự động khi bảng `account` rỗng lúc khởi động — không cần chạy script tay.

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
