# Môi trường dev (máy local)

## Java
- JDK 25: `C:\Program Files\Eclipse Adoptium\jdk-25.0.4.101-hotspot` (Temurin, cài song song).
  Máy hiện tại cài bằng `winget install --id EclipseAdoptium.Temurin.25.JDK`.
- JDK 17/21 vẫn là mặc định trên PATH (dự án khác dùng). Không đổi PATH/JAVA_HOME.
- Dự án dùng JDK 25 qua Maven toolchains: `~/.m2/toolchains.xml` đã khai báo JDK 25 (xem mẫu trong README).

## MySQL
Máy công ty (cũ):
- MySQL 8.4.9 (bản LTS của MySQL 8): dịch vụ `MySQL84`, cổng **3307**, cài song song.
  - Binary: `C:\Program Files\MySQL\MySQL Server 8.4`
  - Cấu hình và dữ liệu: `C:\ProgramData\MySQL\MySQL Server 8.4` (`my.ini`, `Data`)
- MySQL 5.7 (`MySQL57`, cổng 3306) giữ nguyên cho dự án khác, Sweet Home không dùng.
- root: Rootcp7pwBeClX0g045m

Máy hiện tại:
- MySQL 8.0.37: dịch vụ `MySQL80`, cổng **3306** (không có bản khác cài song song nên dùng cổng mặc định).
- root: admin

Chung:
- DB `sweet_home` (utf8mb4), user `sweet_home`@`localhost` chỉ có quyền trên DB này.
  Mật khẩu user ghi trong `application-dev.yml`.
- Kết nối bằng client (máy hiện tại): `mysql -h 127.0.0.1 -P 3306 -u sweet_home -p sweet_home`

## Công cụ khác
- Node 22.22, npm 10.9 bị lỗi `edgesOut` khi cài package → dùng `npx npm@11 install` (npm 11.21) — máy công ty (cũ).
  Máy hiện tại: Node 24.18, npm 11.16 cài sẵn, không gặp lỗi trên, `npm install` bình thường.
- Maven 3.8.5 cài sẵn; dự án dùng Maven Wrapper (Maven 3.9.16).
- Cổng 8080 đang bị một ứng dụng Java khác chiếm → backend Sweet Home chạy cổng 8090.
