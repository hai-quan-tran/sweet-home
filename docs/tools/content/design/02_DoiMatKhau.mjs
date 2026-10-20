// Nội dung file 02_DoiMatKhau.xlsx: màn Đổi mật khẩu.
import { FIRST_VERSION, ROLES } from '../common.mjs';

/** Mở màn Đổi mật khẩu (tài khoản mới đăng nhập lần đầu tự được chuyển tới đây). */
const open = (page, ctx) => ctx.open(page, '/doi-mat-khau');

export default {
  file: '02_DoiMatKhau',
  title: 'Đổi mật khẩu',
  kind: 'Màn hình',
  route: '/doi-mat-khau',
  summary: 'Đổi mật khẩu của tài khoản đang đăng nhập. Bắt buộc ở lần đăng nhập đầu (tài khoản mới hoặc vừa được Quản lý đặt lại mật khẩu tạm); kiểm tra quy tắc mật khẩu và nhập lại khớp.',
  access: [
    'Tự động: đăng nhập bằng tài khoản có mustChangePassword = true → chuyển tới đây; khi chưa đổi, vào bất kỳ màn nào trong app cũng bị đưa về đây (authGuard).',
    'Tự chọn đổi: gõ đường dẫn /doi-mat-khau (khung ứng dụng không có link tới màn này).',
  ],
  roles: `${ROLES.all} (đã đăng nhập)`,
  related: ['01_DangNhap', '15_ThemSuaNhanVien (đặt lại mật khẩu tạm)', '00_TongThe (quy tắc mật khẩu, token)'],
  sources: [
    'frontend/src/app/pages/change-password/change-password-page.{ts,html,scss}',
    'frontend/src/app/core/auth.guard.ts (authenticatedGuard, authGuard), auth.service.ts',
    'backend/.../auth/AuthController.java (POST /auth/change-password), AuthService.changePassword, PasswordPolicy',
  ],
  history: FIRST_VERSION,
  shots: [
    { id: 'main', caption: 'Bắt đổi mật khẩu ở lần đăng nhập đầu', role: 'newStaff', go: open },
    {
      id: 'invalid',
      caption: 'Mật khẩu mới sai quy tắc, nhập lại không khớp',
      note: 'Lỗi kiểm tra ngay trên trình duyệt, hiện sau khi rời ô hoặc bấm Đổi mật khẩu; chưa gửi request.',
      role: 'newStaff',
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.fill('#old', 'matkhau123');
        await page.fill('#new', 'abc123');
        await page.fill('#confirm', 'abc124');
        await page.click('button[type=submit]');
      },
    },
    {
      id: 'error',
      caption: 'Sai mật khẩu hiện tại',
      note: 'Lỗi trả về từ server hiện ở hộp đỏ phía trên các ô.',
      role: 'newStaff',
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.fill('#old', 'saimatkhau1');
        await page.fill('#new', 'MatKhauMoi2026');
        await page.fill('#confirm', 'MatKhauMoi2026');
        await page.click('button[type=submit]');
        await page.locator('.err').waitFor();
      },
    },
  ],
  items: [
    {
      sel: '.page-desc', label: 'Dòng hướng dẫn', kind: 'Chữ (tĩnh)', code: 'forced (computed)',
      note: 'Bị bắt đổi (mustChangePassword): "Đây là lần đăng nhập đầu, bạn cần đổi mật khẩu trước khi tiếp tục." · Tự đổi: "Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số."',
    },
    {
      sel: '#old', label: 'Mật khẩu hiện tại', kind: 'Ô nhập mật khẩu', code: 'form.controls.oldPassword (#old)', dataType: 'string',
      required: 'Có', rule: 'Không để trống. Backend so với mật khẩu đang lưu.', default: '(trống)',
      note: 'Tài khoản mới: là mật khẩu tạm Quản lý đã đặt.',
    },
    {
      sel: '#new', label: 'Mật khẩu mới', kind: 'Ô nhập mật khẩu', code: 'form.controls.newPassword (#new)', dataType: 'string',
      required: 'Có', rule: '≥ 8 ký tự, có ít nhất 1 chữ cái (A–Z, a–z) và 1 chữ số: /^(?=.*[A-Za-z])(?=.*\\d).{8,}$/ (giống PasswordPolicy ở backend).',
      default: '(trống)',
    },
    {
      sel: '#confirm', label: 'Nhập lại mật khẩu mới', kind: 'Ô nhập mật khẩu', code: 'form.controls.confirmPassword (#confirm)',
      dataType: 'string', required: 'Có', rule: 'Phải giống hệt Mật khẩu mới (matchingPasswordsValidator trên cả form).', default: '(trống)',
      note: 'Chỉ kiểm tra ở frontend, không gửi lên server.',
    },
    {
      sel: 'button[type=submit]', label: 'Đổi mật khẩu', kind: 'Nút chính', code: 'submit()',
      note: 'Trong lúc gửi: chữ "Đang lưu...", nút bị khoá. Thành công → Tổng quan.',
    },
    {
      shot: 'invalid', sel: '.field:has(#new) .hint', label: 'Lỗi quy tắc mật khẩu', badge: 'right', kind: 'Chữ báo lỗi', code: "hasError('passwordRule')",
      note: '"Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số." — hiện khi ô đã chạm (touched) và sai quy tắc.',
    },
    {
      shot: 'invalid', sel: '.field:has(#confirm) .hint', label: 'Lỗi nhập lại không khớp', badge: 'right', kind: 'Chữ báo lỗi', code: "form.hasError('mismatch')",
      note: '"Mật khẩu nhập lại không khớp." — hiện khi ô nhập lại đã chạm và khác mật khẩu mới.',
    },
    {
      shot: 'error', sel: '.err', label: 'Hộp báo lỗi', kind: 'Thông báo lỗi', code: 'errorMessage (signal)', dataType: 'string',
      note: 'Hiện "detail" của lỗi trả về; không kết nối được thì "Không đổi được mật khẩu, thử lại sau.".',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN ĐỔI MẬT KHẨU' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Route /doi-mat-khau có authenticatedGuard: chỉ cần đã đăng nhập (vào được cả khi đang bị bắt đổi). Chưa đăng nhập → /dang-nhap?redirect=/doi-mat-khau.',
        'Các màn trong khung ứng dụng dùng authGuard: tài khoản có mustChangePassword = true bị chuyển về /doi-mat-khau cho tới khi đổi xong.',
        'Dòng hướng dẫn (mục 1) đổi theo forced = currentUser.mustChangePassword.',
      ],
    },
    { h: '2. Bấm Đổi mật khẩu' },
    {
      list: [
        'Form không hợp lệ (thiếu ô, sai quy tắc, nhập lại không khớp): đánh dấu mọi ô đã chạm để hiện lỗi (mục 6, 7), không gửi request.',
        'Gửi POST /api/auth/change-password { oldPassword, newPassword } kèm header X-XSRF-TOKEN.',
        'Backend: sai mật khẩu hiện tại → 400; mật khẩu mới sai quy tắc → 400; đúng → lưu hash BCrypt mới, mustChangePassword = false, thu hồi mọi refresh token của tài khoản (các thiết bị khác phải đăng nhập lại), cấp cookie access/refresh token mới cho thiết bị hiện tại (hạn 7 ngày).',
        'Thành công: cập nhật currentUser (mustChangePassword = false) và chuyển /tong-quan.',
        'Không ghi nhật ký thao tác.',
      ],
    },
    { h: '3. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 9 }, { h: 'Nơi báo', w: 5 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Mật khẩu mới sai quy tắc', 'Dưới ô (frontend); 400 nếu gọi thẳng API', 'Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số'],
          ['Nhập lại không khớp', 'Dưới ô (frontend)', 'Mật khẩu nhập lại không khớp.'],
          ['Sai mật khẩu hiện tại', 'Hộp lỗi (400)', 'Mật khẩu hiện tại không đúng'],
          ['Phiên hết hạn / chưa đăng nhập', '401 → về màn Đăng nhập', 'Chưa đăng nhập hoặc phiên đã hết hạn'],
          ['Không kết nối được server', 'Hộp lỗi', 'Không đổi được mật khẩu, thử lại sau.'],
        ],
      },
    },
  ],
};
