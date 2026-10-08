# Môi trường dev (máy local)

## Java
- JDK 25: `C:\Program Files\Eclipse Adoptium\jdk-25.0.4.101-hotspot` (Temurin, cài song song).
- JDK 17 vẫn là mặc định trên PATH (dự án khác dùng). Không đổi PATH/JAVA_HOME.
- Dự án dùng JDK 25 qua Maven toolchains (`~/.m2/toolchains.xml`) và cấu hình runtime của VS Code.

## MySQL
- MySQL 8.4.9 (bản LTS của MySQL 8): dịch vụ `MySQL84`, cổng **3307**, cài song song.
  - Binary: `C:\Program Files\MySQL\MySQL Server 8.4`
  - Cấu hình và dữ liệu: `C:\ProgramData\MySQL\MySQL Server 8.4` (`my.ini`, `Data`)
- MySQL 5.7 (`MySQL57`, cổng 3306) giữ nguyên cho dự án khác, Sweet Home không dùng.
- DB `sweet_home` (utf8mb4), user `sweet_home`@`localhost` chỉ có quyền trên DB này.
  Mật khẩu user ghi trong `application-dev.yml`.
- mysql 8 máy công ty: root - Rootcp7pwBeClX0g045m
- Kết nối bằng client: `mysql -h 127.0.0.1 -P 3307 -u sweet_home -p sweet_home`

## Công cụ khác
- Node 22.22, npm 10.9 (đủ cho Angular 21). Maven 3.8.5 (dự án dùng Maven Wrapper).
