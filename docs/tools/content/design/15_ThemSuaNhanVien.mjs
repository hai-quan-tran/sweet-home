// Nội dung file 15_ThemSuaNhanVien.xlsx: màn Thêm / Sửa nhân viên.
import { ROLES, fixVersion } from '../common.mjs';

const SIDE = 'aside.card';

export default {
  file: '15_ThemSuaNhanVien',
  title: 'Thêm / Sửa nhân viên',
  kind: 'Màn hình',
  route: '/nhan-vien/them · /nhan-vien/{id}/sua',
  summary: 'Tạo tài khoản (thông tin cá nhân, tên đăng nhập, mật khẩu tạm, vai trò, kích hoạt) hoặc sửa: đổi thông tin, vai trò, khoá/mở, đặt lại mật khẩu tạm. Không có ca làm (xếp ở Lịch làm).',
  access: ['Nhân viên → "Thêm nhân viên" (thêm).', 'Nhân viên → bấm một tài khoản (sửa).'],
  roles: `${ROLES.manager} (managerGuard; Nhân viên vào thẳng URL bị đưa về /nhan-vien, API trả 403).`,
  related: ['14_NhanVien', '02_DoiMatKhau (bắt đổi mật khẩu lần đầu)', '01_DangNhap (tài khoản khoá)', '16_LichLam (ngày bắt đầu làm)'],
  sources: [
    'frontend/src/app/pages/staff/staff-form-page.{ts,html,scss}, staff-permissions.ts',
    'backend/.../staff/AccountController.java (POST /accounts, PUT /accounts/{id}), AccountManagementService, AccountUpsertRequest; auth/PasswordPolicy',
  ],
  history: fixVersion('Ô lỗi viền đỏ + hộp lỗi "Vui lòng nhập đủ các ô bắt buộc" khi lưu; giới hạn độ dài ô chữ (CCCD tối đa 20 ký tự).'),
  shots: [
    {
      id: 'add',
      caption: 'Thêm nhân viên (đã bấm Tạo ngẫu nhiên)',
      go: async (page, ctx) => {
        await ctx.open(page, '/nhan-vien/them');
        await page.fill('#fn', 'Hoàng Thị Mỹ');
        await page.fill('#ph', '0901 555 777');
        await page.fill('#cc', '079301002468');
        await page.fill('#sd', '2026-11-01');
        await page.fill('#un', 'nv_my');
        await page.click('button:has-text("Tạo ngẫu nhiên")');
      },
    },
    {
      id: 'invalid',
      caption: 'Tên đăng nhập, mật khẩu sai quy tắc',
      note: 'Bấm Tạo tài khoản khi form chưa hợp lệ: ô lỗi viền đỏ, dòng gợi ý dưới ô chuyển màu đỏ, đầu form hiện hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ)." (ngoài vùng ảnh), không gửi.',
      clip: '.card:has(h2:has-text("Tài khoản đăng nhập"))',
      go: async (page, ctx) => {
        await ctx.open(page, '/nhan-vien/them');
        await page.fill('#un', 'Hà Trần');
        await page.fill('#pw', 'abc');
        await page.click('.sum-a .btn-p');
      },
    },
    {
      id: 'edit',
      caption: 'Sửa nhân viên',
      go: async (page, ctx) => {
        await ctx.open(page, `/nhan-vien/${ctx.acc.ha}/sua`);
        await page.locator('#un[disabled]').waitFor();
      },
    },
    {
      id: 'self',
      caption: 'Quản lý sửa chính mình: khoá vai trò, trạng thái',
      fullPage: false,
      go: async (page, ctx) => {
        await ctx.open(page, `/nhan-vien/${ctx.managerId}/sua`);
        await page.locator('#un[disabled]').waitFor();
        await page.locator('.card:has(h2:has-text("Vai trò"))').scrollIntoViewIfNeeded();
      },
    },
  ],
  items: [
    { sel: '.ph', label: 'Đường dẫn + tiêu đề', kind: 'Chữ', code: 'isEdit()', note: '"Nhân viên › Thêm nhân viên / Sửa nhân viên".' },
    { sel: '#fn', label: 'Họ tên', kind: 'Ô nhập chữ', code: 'form.controls.fullName', dataType: 'string', required: 'Có', rule: 'Tối đa 100 ký tự (frontend maxlength + backend); bỏ khoảng trắng đầu cuối.' },
    { sel: '#ph', label: 'Số điện thoại', kind: 'Ô nhập (tel)', code: 'form.controls.phone', dataType: 'string', required: 'Có', rule: 'Tối đa 20 ký tự (frontend maxlength + backend).' },
    {
      sel: '.field:has(#cc)', label: 'CCCD', kind: 'Ô nhập + gợi ý', code: 'form.controls.idNumber', dataType: 'string', required: 'Không',
      rule: 'Chỉ chữ số và khoảng trắng (frontend + backend "Chỉ gồm chữ số"), tối đa 20 ký tự. Bỏ khoảng trắng rồi mã hoá AES; chỉ hiện 4 số cuối.',
      default: 'Placeholder "12 số"', note: 'Sửa: placeholder "•••• 1234", để trống = giữ số đã lưu.',
    },
    { sel: '#sd', label: 'Ngày bắt đầu làm', kind: 'Ô ngày', code: 'form.controls.startDate', dataType: 'date', required: 'Không', note: 'Lịch làm không xếp ca trước ngày này.' },
    {
      sel: '.field:has(#un)', label: 'Tên đăng nhập', kind: 'Ô nhập + gợi ý', code: 'form.controls.username', dataType: 'string', required: 'Có (thêm)',
      rule: '3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang (/^[A-Za-z0-9._-]{3,50}$/); không trùng tài khoản khác (409).',
      note: 'Sửa: ô bị khoá, gợi ý "Không đổi được tên đăng nhập".',
    },
    {
      sel: '.field:has(#pw) .iw', label: 'Mật khẩu tạm thời / Đặt lại mật khẩu tạm', kind: 'Ô nhập mật khẩu + nút mắt', code: 'form.controls.password · showPassword',
      dataType: 'string', required: 'Có (thêm); sửa: không', rule: '≥ 8 ký tự, có chữ và số (PasswordPolicy). Sửa: để trống = giữ mật khẩu cũ.',
    },
    {
      sel: 'button:has-text("Tạo ngẫu nhiên")', label: 'Tạo ngẫu nhiên', kind: 'Nút phụ', code: 'generatePassword() · randomPassword()',
      note: 'Sinh 10 ký tự bằng crypto.getRandomValues, luôn có chữ và số, bỏ ký tự dễ nhầm (0/O, 1/l/I); hiện mật khẩu để Quản lý đọc cho nhân viên.',
    },
    {
      sel: '.card:has(h2:has-text("Tài khoản đăng nhập")) .sw', label: 'Bắt đổi mật khẩu', kind: 'Ô chọn (checkbox)', code: 'form.controls.mustChangePassword',
      dataType: 'boolean', default: 'Chọn', note: 'Thêm: "Bắt đổi mật khẩu ở lần đăng nhập đầu tiên"; sửa: "Khi đặt lại mật khẩu: bắt đổi ở lần đăng nhập tới" (chỉ có tác dụng khi có nhập mật khẩu mới).',
    },
    {
      sel: '.card:has(h2:has-text("Vai trò")) fieldset', label: 'Vai trò', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.role', dataType: 'STAFF | MANAGER',
      required: 'Có', default: 'Nhân viên', note: 'Đổi vai trò có hiệu lực ngay (cả phiên đang đăng nhập). Cột phải đổi theo vai trò đang chọn.',
    },
    {
      sel: '.card:has(h2:has-text("Vai trò")) .sw', label: 'Kích hoạt / đang hoạt động', kind: 'Ô chọn (checkbox)', code: 'form.controls.active', dataType: 'boolean',
      default: 'Chọn', note: 'Thêm: "Kích hoạt tài khoản ngay"; sửa: "Tài khoản đang hoạt động (bỏ chọn để khoá)". Khoá: không đăng nhập được, phiên đang mở bị từ chối ngay.',
    },
    {
      sel: `${SIDE} .perm`, label: 'Quyền của vai trò đã chọn', kind: 'Danh sách (tĩnh)', code: 'role() · STAFF_PERMISSIONS',
      note: 'Nhân viên: danh sách ✓/✗ như màn Nhân viên; Quản lý: "Toàn quyền, gồm bảng giá, doanh thu, nhân viên và nhật ký".',
    },
    { sel: `${SIDE} .info`, label: 'Nhắc bảo mật', kind: 'Chữ (tĩnh)', code: '.info', note: '"Đưa mật khẩu tạm trực tiếp cho nhân viên, không gửi vào nhóm chat chung…".' },
    {
      sel: `${SIDE} .sum-a`, label: 'Tạo tài khoản / Lưu thay đổi · Huỷ', kind: 'Nút chính + link', code: 'submit()',
      note: 'Đang lưu: "Đang lưu...". Xong → /nhan-vien. Huỷ: về /nhan-vien không lưu.',
    },
    { shot: 'invalid', sel: '.field:has(#un) .hint.bad', label: 'Gợi ý tên đăng nhập (đỏ)', kind: 'Chữ báo lỗi', code: "hint.bad (username invalid && touched)", badge: 'right' },
    { shot: 'invalid', sel: '.field:has(#pw) .hint.bad', label: 'Gợi ý mật khẩu (đỏ)', kind: 'Chữ báo lỗi', code: 'hint.bad (password invalid && touched)', badge: 'right' },
    { shot: 'edit', sel: '#un', label: 'Tên đăng nhập (khoá)', kind: 'Ô nhập (disabled)', code: 'username.disable()', note: 'Không đổi được vì nhật ký, created/updated by ghi theo tên đăng nhập.' },
    { shot: 'edit', sel: '#cc', label: 'CCCD đã lưu', kind: 'Ô nhập', code: 'idNumberMasked', note: 'Placeholder 4 số cuối, gợi ý "Để trống để giữ số đã lưu".' },
    {
      shot: 'self', sel: '.card:has(h2:has-text("Vai trò")) .hint', label: 'Không tự đổi vai trò / tự khoá', kind: 'Chữ', code: 'isSelf()',
      note: '"Không thể tự đổi vai trò hoặc tự khoá tài khoản của chính mình." — ô Vai trò và Đang hoạt động bị khoá → luôn còn ít nhất 1 Quản lý hoạt động.',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN THÊM / SỬA NHÂN VIÊN' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Thêm: form trống, mật khẩu bắt buộc, Bắt đổi mật khẩu = chọn, Nhân viên, Kích hoạt = chọn.',
        'Sửa: GET /api/accounts/{id} → điền form (không trả mật khẩu, CCCD chỉ 4 số cuối); khoá ô Tên đăng nhập. Sửa chính mình: khoá thêm Vai trò, Đang hoạt động.',
      ],
    },
    { h: '2. Lưu' },
    {
      list: [
        'Form không hợp lệ: đánh dấu đã chạm (ô lỗi viền đỏ, gợi ý tên đăng nhập / mật khẩu chuyển đỏ), hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ).", con trỏ tới ô lỗi đầu tiên, không gửi.',
        'Thêm: POST /api/accounts — tên đăng nhập trùng → 409; kiểm tra quy tắc mật khẩu; lưu hash BCrypt, mustChangePassword theo ô chọn. Nhật ký ACCOUNT_CREATED "Thêm tài khoản {họ tên} ({tên đăng nhập}), vai trò {…}".',
        'Sửa: PUT /api/accounts/{id} (bỏ qua username) — sửa chính mình mà đổi vai trò khác Quản lý hoặc khoá → 400. Có mật khẩu mới: đặt hash mới, mustChangePassword theo ô chọn, xoá đếm sai / khoá tạm đăng nhập. Có mật khẩu mới hoặc khoá tài khoản → thu hồi mọi refresh token (đăng xuất mọi thiết bị).',
        'Nhật ký ACCOUNT_UPDATED "Sửa tài khoản {họ tên} ({tên đăng nhập})[: mở khoá | khoá tài khoản, đổi vai trò sang …, đặt lại mật khẩu]".',
        'Khoá / đổi vai trò có hiệu lực ngay: mỗi request backend nạp lại tài khoản theo id trong token, tài khoản LOCKED → 401, vai trò lấy từ DB.',
      ],
    },
    { h: '3. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 12 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Tên đăng nhập đã có', 409, 'Tên đăng nhập đã được dùng'],
          ['Mật khẩu sai quy tắc', 400, 'Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số'],
          ['Tự khoá / tự đổi vai trò', 400, 'Không thể tự khoá hoặc tự đổi vai trò của chính mình'],
          ['Tên đăng nhập sai định dạng, CCCD có chữ, quá dài (gọi thẳng API)', 400, 'Dữ liệu không hợp lệ (errors: "3–50 ký tự: chữ không dấu, số, dấu chấm, gạch", "Chỉ gồm chữ số", "Tối đa 100 ký tự"…)'],
          ['Thiếu ô bắt buộc / sai quy tắc', 'frontend', 'Vui lòng nhập đủ các ô bắt buộc (viền đỏ).'],
          ['Tài khoản không tồn tại', 404, 'Không tìm thấy tài khoản'],
          ['Lỗi khác', '—', 'Không lưu được tài khoản, thử lại sau.'],
        ],
      },
    },
  ],
};
