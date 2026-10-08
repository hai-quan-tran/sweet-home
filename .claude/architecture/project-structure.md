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
| MySQL 8.4 | 3307 |
