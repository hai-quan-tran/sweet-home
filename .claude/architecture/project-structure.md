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
