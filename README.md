# Sweet Home

App quản lý cho thuê homestay theo giờ, theo ngày.

| Thư mục | Nội dung |
|---|---|
| `backend/` | Java 25, Spring Boot 4, Maven, Liquibase, MySQL 8 |
| `frontend/` | Angular 21, PrimeNG 21 (theme Aura) |
| `design/` | Bản thiết kế HTML, mở `design/index.html` bằng trình duyệt |

## Chuẩn bị
- JDK 25 và khai báo trong `~/.m2/toolchains.xml` (Maven chạy bằng JDK nào cũng được, biên dịch bằng JDK 25):
  ```xml
  <toolchains>
    <toolchain>
      <type>jdk</type>
      <provides><version>25</version></provides>
      <configuration><jdkHome>C:\Program Files\Eclipse Adoptium\jdk-25.0.4.101-hotspot</jdkHome></configuration>
    </toolchain>
  </toolchains>
  ```
- MySQL 8, tạo DB và user:
  ```sql
  CREATE DATABASE sweet_home CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  CREATE USER 'sweet_home'@'localhost' IDENTIFIED BY '<mật khẩu>';
  GRANT ALL PRIVILEGES ON sweet_home.* TO 'sweet_home'@'localhost';
  ```
  Thông tin kết nối dev nằm ở `backend/src/main/resources/application-dev.yml`.
- Node 22 và npm 11. Nếu máy đang là npm 10 thì dùng `npx npm@11 install` (npm 10.9 lỗi khi cài).

## Chạy
```bash
# Backend: http://localhost:8090/api (profile dev mặc định)
cd backend
./mvnw spring-boot:run

# Frontend: http://localhost:4200, /api được chuyển tới backend
cd frontend
npm install
npm start
```

## Test
```bash
cd backend && ./mvnw verify        # unit test + kiểm tra độ phủ ≥ 80% (báo cáo: target/site/jacoco)
cd frontend && npx ng test --watch=false
```

## Môi trường stage, prod
Chạy với `--spring.profiles.active=stage` (hoặc `prod`) và đặt biến môi trường:
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT` (mặc định 8080).
