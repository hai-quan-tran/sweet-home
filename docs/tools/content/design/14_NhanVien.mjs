// Nội dung file 14_NhanVien.xlsx: màn Nhân viên (tài khoản, quyền, nhật ký thao tác).
import { FIRST_VERSION, ROLES } from '../common.mjs';

/** Mở màn Nhân viên, chờ danh sách tài khoản. */
const open = async (page, ctx) => {
  await ctx.open(page, '/nhan-vien');
  await page.locator('.people li').first().waitFor();
};

export default {
  file: '14_NhanVien',
  title: 'Nhân viên',
  kind: 'Màn hình',
  route: '/nhan-vien',
  summary: 'Danh sách tài khoản (vai trò, SĐT, đang trong ca / đã khoá), quyền cố định của vai trò Nhân viên; Quản lý thấy thêm nhật ký thao tác (lọc theo thời gian, người) và vào được Thêm/Sửa nhân viên.',
  access: ['Menu trái → Nhân viên.'],
  roles: `${ROLES.all}. Chỉ Quản lý: Thêm nhân viên, bấm tài khoản để sửa, Nhật ký thao tác.`,
  related: ['15_ThemSuaNhanVien', '16_LichLam (tag ca)', '00_TongThe (nhật ký thao tác, bảng account, activity_log)'],
  sources: [
    'frontend/src/app/pages/staff/staff-page.{ts,html,scss}, staff-permissions.ts',
    'frontend/src/app/core/account.service.ts, activity-log.service.ts, schedule.service.ts',
    'backend/.../staff/AccountController.java (GET /accounts), activity/ActivityLogController.java (GET /activity-logs), schedule/ScheduleController (GET /shifts)',
  ],
  history: FIRST_VERSION,
  shots: [
    {
      id: 'manager',
      caption: 'Màn Nhân viên (Quản lý), nhật ký lọc người = Hệ thống',
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.selectOption('.log-card .filters select[aria-label="Người thao tác"]', 'system');
        await page.waitForLoadState('networkidle');
      },
    },
    { id: 'staff', caption: 'Màn Nhân viên (Nhân viên): không có nhật ký', role: 'staff', fullPage: false, go: open },
  ],
  items: [
    { sel: '.ph .page-desc', label: 'Mô tả', kind: 'Chữ', code: 'isManager()', note: 'Quản lý: "Tài khoản, quyền và nhật ký thao tác. Xếp ca ở mục Lịch làm."; Nhân viên không có phần nhật ký.' },
    { sel: '.ph a[pButton]', label: 'Thêm nhân viên', kind: 'Nút phụ (link)', code: 'routerLink="/nhan-vien/them"', badge: 'right', note: 'Chỉ Quản lý. Mở file 15.' },
    { sel: '.acc .ch', label: 'Tài khoản · số người', kind: 'Tiêu đề card', code: 'accounts().length', note: 'Mọi tài khoản (kể cả đã khoá).' },
    {
      sel: '.people li >> nth=0', label: 'Một tài khoản', kind: 'Dòng (link với Quản lý)', code: "routerLink=['/nhan-vien', id, 'sua']",
      note: 'Ảnh chữ viết tắt (chữ đầu của từ đầu + từ cuối họ tên), họ tên, "{Quản lý/Nhân viên} · {SĐT, không có thì tên đăng nhập}". Sắp: Nhân viên trước, Quản lý sau, cùng vai trò theo họ tên. Quản lý bấm để sửa.',
    },
    {
      sel: '.people .tag.t-i >> nth=0', label: 'Tag Đang trong ca', kind: 'Tag (xanh lá)', code: 'shiftTags()', badge: 'right',
      note: 'Bây giờ nằm trong một ca của người đó. Không đang trong ca nhưng còn ca bắt đầu sau trong hôm nay: "Vào ca HH:mm" (xám). Tính ở frontend từ ca hôm qua → hết hôm nay.',
    },
    { sel: '.people .tag.t-c', label: 'Tag Đã khoá', kind: 'Tag (đỏ)', code: "status === 'LOCKED'", badge: 'right', note: 'Ưu tiên: Đã khoá → tag ca → Quản lý.' },
    { sel: '.people .tag.t-b >> nth=0', label: 'Tag Quản lý', kind: 'Tag (xanh dương)', code: "role === 'MANAGER'", badge: 'right', note: 'Khi Quản lý không có tag ca.' },
    {
      sel: '.log-card .filters', label: 'Lọc nhật ký', kind: '2 ô chọn', code: 'period · setPeriod() · actor · setActor()',
      dataType: "'today' | 'week' | 'month'; tên đăng nhập | 'system'", default: 'Hôm nay · Mọi người',
      note: 'Thời gian: Hôm nay / 7 ngày (gồm hôm nay) / Tháng này. Người: mọi tài khoản + "Hệ thống". Đổi lọc tải lại từ trang đầu.',
    },
    { sel: '.log thead', label: 'Bảng nhật ký', kind: 'Bảng', code: 'logs()', note: 'Giờ · Người · Thao tác · Đơn. Mới nhất ở trên. Không có dòng: "Chưa có thao tác nào trong khoảng này."' },
    {
      sel: '.log tbody tr >> nth=0', label: 'Một dòng nhật ký', kind: 'Dòng bảng', code: 'ActivityLogDto',
      note: 'Giờ: "HH:mm" nếu hôm nay, khác ngày "dd/MM HH:mm"; Người: họ tên hiện tại (tài khoản tác vụ nền hiện "Hệ thống" chữ nghiêng); Thao tác: câu mô tả (vd "Trả phòng, thu 50.000đ tiền mặt"); Đơn: link mã đơn (mở /don-thue?id=) · P{số phòng}, chỉ phòng, hoặc "—".',
    },
    {
      sel: '.perm-card', label: 'Quyền của nhân viên', kind: 'Danh sách (tĩnh)', code: 'STAFF_PERMISSIONS',
      note: 'Dấu ✓ được / ✗ không được (xem sheet 4). Quyền cố định theo vai trò, không cấu hình.',
    },
    { shot: 'staff', sel: '.grid', label: 'Bố cục khi Nhân viên xem', kind: 'Vùng', code: '.grid (không có with-log)', badge: 'inside', note: 'Chỉ có Tài khoản và Quyền; dòng tài khoản không bấm được; không có nút Thêm nhân viên.' },
  ],
  logic: [
    { title: 'LOGIC MÀN NHÂN VIÊN' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'GET /api/accounts → danh sách tài khoản (mọi vai trò được xem; CCCD chỉ trả dạng che).',
        'GET /api/shifts?from={hôm qua}&to={ngày mai} → tính tag "Đang trong ca" / "Vào ca HH:mm" (ca đêm hôm qua có thể kéo sang hôm nay).',
        'Quản lý: GET /api/activity-logs?from={mốc}&page=0 (50 dòng/trang, mới nhất trước; backend chặn Nhân viên bằng @PreAuthorize).',
      ],
    },
    { h: '2. Nhật ký thao tác' },
    {
      list: [
        'Mốc from theo giờ máy: Hôm nay 00:00 / 6 ngày trước 00:00 / ngày 1 của tháng 00:00. actor = tên đăng nhập, "system" = Hệ thống, bỏ trống = mọi người.',
        'Còn dòng chưa tải (đã tải < total): nút "Xem thêm ({số còn lại})" tải trang kế tiếp nối vào cuối.',
        'Dữ liệu: created_at, actor (+ actorName = họ tên hiện tại), detail, orderId (+ orderCode), roomNumber. Các thao tác được ghi: xem 00_TongThe sheet 4 mục 5.',
      ],
    },
    { h: '3. Quyền vai trò Nhân viên (STAFF_PERMISSIONS)' },
    {
      table: {
        cols: [{ h: 'Quyền', w: 26 }, { h: 'Được', w: 6 }],
        rows: [
          ['Xem lịch phòng và đơn thuê', 'Có'],
          ['Tạo đơn, nhận phòng, trả phòng, thu tiền', 'Có'],
          ['Xem mã cửa của đơn trong ca mình trực', 'Có'],
          ['Chọn mẫu và sao chép tin nhắn gửi khách', 'Có'],
          ['Xem phòng, bảng giá, phụ thu, nhân viên và lịch làm', 'Có'],
          ['Thêm, sửa phòng · sửa bảng giá · thêm, sửa phụ thu', 'Không'],
          ['Thêm, sửa nhân viên · xem nhật ký thao tác', 'Không'],
          ['Xếp, sửa lịch làm và ca mẫu', 'Không'],
          ['Sửa mẫu tin nhắn, thông tin homestay', 'Không'],
          ['Huỷ đơn đã thu tiền, sửa số tiền đã thu', 'Không'],
          ['Xem doanh thu', 'Không'],
        ],
      },
    },
    { note: 'Danh sách này chỉ để hiển thị; quyền thật kiểm tra ở backend (00_TongThe, sheet 4 — bảo mật, danh sách API).' },
  ],
};
