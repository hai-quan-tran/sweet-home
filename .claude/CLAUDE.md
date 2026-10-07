1. Mô tả app
App quản lý cho thuê homestay theo giờ, theo ngày dành cho người cho thuê. Sau khi xác nhận thông tin thuê từ người thuê sẽ nhập vào app này để quản lý.
Dịch vụ cho thuê tên là Sweet Home.

2. Công nghệ
Frontend: Angular v21. Primeng: Theme Aura có primary là xanh dương, có dark mode
Backend: Java v25. Spring boot 4. JWT
DB: mysql 8
Unit test: JUnit, mockito

3. Rule
 - Comment mỗi function
 - Đảm bảo security
 - Suy nghĩ khi nhận được yêu cầu, không rõ phải xác nhận lại
 - Ưu tiên viết ít code nhưng đảm bảo logic. Không thêm code thừa
 - Đảm bảo unit test coverage
 - Giao diện hỗ trợ desktop, laptop và iPad (nhỏ nhất 9 inch)
 - Khi lên kế hoạch cần chia thành từng giai đoạn nhỏ, mỗi khi đã xác nhận hoàn thành giai đoạn thì commit giai đoạn đó.
 - Message commit cần ghi rõ giai đoạn này sửa những chức năng gì. (không cần liệt kê những file được sửa)
 - Không tự động push. Chỉ push khi đã xác nhận

4. Other
 - .claude/todo: lưu plan đã lên kế hoạch, cac công việc chưa thực hiện, còn dang dở, các công việc cần làm
 - .claude/architecture: lưu thiết kế, luồng dữ liệu, các api và kỹ thuật quan trọng, quy trình hoạt động
 - Đầu mỗi session: đọc các file trong .claude/todo để nắm công việc dang dở. đọc các file trong .claude/architecture để nắm thiết kế, luông dữ liệu,....
 - Sau khi hoàn thành việc hoặc thay đổi thiết kế: cập nhật lại file md tương ứng.