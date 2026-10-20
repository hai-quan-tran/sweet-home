// Nội dung file 01_DangNhap.xlsx: màn Đăng nhập.
import { FIRST_VERSION, ROLES } from '../common.mjs';

export default {
  file: '01_DangNhap',
  title: 'Đăng nhập',
  kind: 'Màn hình',
  route: '/dang-nhap (có thể kèm ?redirect=<màn muốn vào>)',
  summary: 'Màn đăng nhập cho Quản lý và Nhân viên: nhập tên đăng nhập, mật khẩu, chọn ghi nhớ thiết bị; báo lỗi sai mật khẩu, tài khoản bị khoá, khoá tạm do sai nhiều lần.',
  access: [
    'Mở app khi chưa đăng nhập (hoặc phiên đã hết hạn): mọi màn tự chuyển về /dang-nhap?redirect=<màn đó>.',
    'Bấm nút Đăng xuất trên thanh trên cùng (file 03).',
    'Đã đăng nhập mà vào /dang-nhap thì tự chuyển sang Tổng quan (guestGuard).',
  ],
  roles: ROLES.guest,
  related: ['02_DoiMatKhau (bắt đổi mật khẩu lần đầu)', '03_KhungUngDung (đăng xuất)', '00_TongThe (bảo mật, token, cookie)'],
  sources: [
    'frontend/src/app/pages/login/login-page.{ts,html,scss}',
    'frontend/src/app/core/auth.service.ts, auth.guard.ts (guestGuard), auth.interceptor.ts',
    'backend/.../auth/AuthController.java (POST /auth/login), AuthService.login, LoginRequest',
  ],
  history: FIRST_VERSION,
  shots: [
    {
      id: 'main',
      caption: 'Màn Đăng nhập',
      role: 'guest',
      go: (page, ctx) => ctx.open(page, '/dang-nhap'),
    },
    {
      id: 'error',
      caption: 'Đăng nhập sai mật khẩu',
      note: 'Thông báo lỗi lấy từ server, hiện phía trên ô Tên đăng nhập.',
      role: 'guest',
      go: async (page, ctx) => {
        await ctx.open(page, '/dang-nhap');
        await page.fill('#u', 'nv_ha');
        await page.fill('#p', 'saimatkhau1');
        await page.click('button[type=submit]');
        await page.locator('.err').waitFor();
      },
    },
  ],
  items: [
    {
      sel: '.hero', label: 'Khu giới thiệu', kind: 'Vùng chữ (tĩnh)', code: 'section.hero',
      note: 'Logo, tên Sweet Home, câu giới thiệu. Ẩn khi màn hình ≤ 900px (chỉ còn khung đăng nhập).',
    },
    {
      sel: '.theme-btn', label: 'Nút giao diện sáng / tối', kind: 'Nút icon', code: 'theme.toggle()', badge: 'right',
      note: 'Icon mặt trăng (đang sáng) / mặt trời (đang tối). Lựa chọn lưu ở localStorage, dùng chung cho cả app.',
    },
    {
      sel: '#u', label: 'Tên đăng nhập', kind: 'Ô nhập chữ', code: 'form.controls.username (#u)', dataType: 'string',
      required: 'Có', rule: 'Không để trống (Validators.required; backend @NotBlank).', default: '(trống)',
      note: 'autocomplete="username".',
    },
    {
      sel: '#p', label: 'Mật khẩu', kind: 'Ô nhập mật khẩu', code: 'form.controls.password (#p)', dataType: 'string',
      required: 'Có', rule: 'Không để trống. Không kiểm tra quy tắc mật khẩu ở màn này.', default: '(trống)',
      note: 'Che ký tự (type="password") trừ khi bấm nút hiện mật khẩu.',
    },
    {
      sel: '.eye', label: 'Nút hiện / ẩn mật khẩu', kind: 'Nút icon', code: 'toggleShowPassword() · showPassword', badge: 'right',
      note: 'Đổi ô Mật khẩu giữa type="password" và "text"; icon mắt / mắt gạch.',
    },
    {
      sel: '.chk', label: 'Ghi nhớ trên thiết bị này', kind: 'Ô chọn (checkbox)', code: 'form.controls.rememberDevice',
      dataType: 'boolean', required: 'Không', default: 'Không chọn (false)',
      note: 'Chọn: phiên đăng nhập giữ 30 ngày; không chọn: 7 ngày (hạn refresh token).',
    },
    {
      sel: 'button[type=submit]', label: 'Đăng nhập', kind: 'Nút chính', code: 'submit()',
      note: 'Trong lúc gửi: chữ "Đang đăng nhập...", nút bị khoá (submitting). Phím Enter trong form cũng gửi.',
    },
    {
      shot: 'error', sel: '.err', label: 'Hộp báo lỗi', kind: 'Thông báo lỗi', code: 'errorMessage (signal)', dataType: 'string',
      note: 'Hiện "detail" của lỗi trả về; không có (mất kết nối) thì "Không đăng nhập được, thử lại sau.". Mất đi khi bấm Đăng nhập lần tiếp.',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN ĐĂNG NHẬP' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Route /dang-nhap có guestGuard: gọi GET /auth/me (nếu chưa có thông tin tài khoản). Đã đăng nhập → chuyển /tong-quan; chưa (401) → hiện màn.',
        'Form trống, "Ghi nhớ trên thiết bị này" không chọn, không có thông báo lỗi.',
      ],
    },
    { h: '2. Bấm Đăng nhập' },
    {
      list: [
        'Thiếu tên đăng nhập hoặc mật khẩu: không gửi request (form.invalid), không báo gì thêm.',
        'Đang gửi thì bấm lại không có tác dụng (submitting = true, nút bị khoá).',
        'Gửi POST /api/auth/login { username, password, rememberDevice } (không cần CSRF).',
        'Thành công: backend đặt cookie access_token (30 phút) và refresh_token (7 hoặc 30 ngày), trả AccountSummary { id, username, fullName, role, mustChangePassword }; frontend lưu vào AuthService.currentUser (signal, không lưu token).',
        'mustChangePassword = true → chuyển /doi-mat-khau (file 02). Ngược lại → chuyển tới query param redirect nếu có, không thì /tong-quan.',
        'Lỗi: hiện detail của lỗi trong hộp báo lỗi (mục 8).',
      ],
    },
    { h: '3. Xử lý ở backend (AuthService.login)' },
    {
      list: [
        'Tên đăng nhập không tồn tại: vẫn so mật khẩu với một hash giả (thời gian trả lời như tài khoản có thật) rồi báo 401.',
        'Đang trong thời gian khoá tạm (login_locked_until > bây giờ): 429, kể cả khi mật khẩu đúng.',
        'Sai mật khẩu: tăng failed_login_count; đủ 5 lần liên tiếp → đặt login_locked_until = bây giờ + 15 phút, đếm về 0, báo 429. Số lần sai vẫn được lưu dù request lỗi (noRollbackFor).',
        'Mật khẩu đúng nhưng tài khoản LOCKED: 403 "Tài khoản đã bị khoá" (chỉ báo khi mật khẩu đúng, không lộ tài khoản tồn tại).',
        'Đúng: đặt lại số lần sai về 0, cấp access token JWT + refresh token mới (lưu SHA-256 vào refresh_token, remembered = rememberDevice).',
        'Không ghi nhật ký thao tác cho đăng nhập.',
      ],
    },
    { h: '4. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 9 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 21 }],
        rows: [
          ['Sai tên đăng nhập hoặc mật khẩu', 401, 'Tên đăng nhập hoặc mật khẩu không đúng'],
          ['Sai lần thứ 5 liên tiếp / đang khoá tạm', 429, 'Đăng nhập sai quá nhiều lần, thử lại sau N phút (N = số phút còn lại, làm tròn lên, tối thiểu 1)'],
          ['Tài khoản đã bị Quản lý khoá (mật khẩu đúng)', 403, 'Tài khoản đã bị khoá'],
          ['Không kết nối được server', '—', 'Không đăng nhập được, thử lại sau.'],
        ],
      },
    },
    { h: '5. Sơ đồ luồng' },
    { diagram: 'flow' },
  ],
  diagrams: {
    flow: `flowchart TD
  A([Mở /dang-nhap]) --> B{GET /auth/me<br/>đã đăng nhập?}
  B -- Có --> T([Tổng quan])
  B -- Không --> C[Nhập tên đăng nhập, mật khẩu<br/>chọn Ghi nhớ thiết bị] --> D[Bấm Đăng nhập]
  D --> E{Đủ 2 ô?}
  E -- Không --> C
  E -- Có --> F[POST /auth/login]
  F --> G{Kết quả}
  G -- "401 / 403 / 429" --> H[Hiện hộp báo lỗi] --> C
  G -- 200 --> I{mustChangePassword?}
  I -- Có --> J([Đổi mật khẩu])
  I -- Không --> K([redirect hoặc Tổng quan])`,
  },
};
