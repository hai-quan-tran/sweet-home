// Nội dung file 03_KhungUngDung.xlsx: khung chung sau đăng nhập (menu, thanh trên, chuông thông báo, dark mode).
import { FIRST_VERSION, MENU_LABELS, ROLES } from '../common.mjs';

/** Mở Tổng quan và chờ chuông có số đếm (thông báo đã tải). */
const openHome = async (page, ctx) => {
  await ctx.open(page, '/tong-quan');
  await page.locator('.ntf-wrap .badge').waitFor();
};

export default {
  file: '03_KhungUngDung',
  title: 'Khung ứng dụng',
  kind: 'Thành phần dùng chung (bao quanh mọi màn sau đăng nhập)',
  route: 'Mọi route con của Shell: /tong-quan, /lich, /don-thue, /phong, /nhan-vien, /lich-lam, /cai-dat, ...',
  summary: 'Khung chung của app sau khi đăng nhập: menu trái, thanh trên cùng (dark mode, chuông thông báo, nút Tạo đơn thuê, tài khoản, đăng xuất) và vùng nội dung. Mô tả cả bảng thông báo xổ xuống từ nút chuông và giao diện iPad.',
  access: ['Đăng nhập thành công (và không bị bắt đổi mật khẩu) → luôn hiện quanh màn đang mở.'],
  roles: `${ROLES.all}. Khác nhau: thông báo "Thiếu nhân viên trực" chỉ Quản lý thấy.`,
  related: ['01_DangNhap', '04_TongQuan', '07_ChiTietDon (nút xử lý nhanh mở chi tiết đơn)', '16_LichLam (Mở lịch làm)'],
  sources: [
    'frontend/src/app/layout/shell.{ts,html,scss}, layout/menu.ts',
    'frontend/src/app/core/notification.service.ts (describeNotification), theme.service.ts, auth.service.ts',
    'frontend/src/app/app.routes.ts (authGuard trên Shell)',
    'backend/.../dashboard/DashboardController.java (GET /notifications), DashboardService.notifications',
  ],
  history: FIRST_VERSION,
  shots: [
    { id: 'main', caption: 'Khung ứng dụng (màn Tổng quan, Quản lý)', fullPage: false, go: openHome },
    {
      id: 'notify',
      caption: 'Bảng thông báo khi bấm chuông',
      fullPage: false,
      go: async (page, ctx) => {
        await openHome(page, ctx);
        await page.click('.ntf-wrap p-button button');
        await page.locator('.ntf .ntf-i').first().waitFor();
        await page.waitForLoadState('networkidle');
      },
    },
    {
      id: 'ipad',
      caption: 'iPad ngang (1024px): menu thu thành cột icon',
      viewport: { width: 1024, height: 768 },
      fullPage: false,
      go: openHome,
    },
    {
      id: 'dark',
      caption: 'Giao diện tối (dark mode)',
      isolated: true,
      fullPage: false,
      go: async (page, ctx) => {
        await openHome(page, ctx);
        await page.click('button[aria-label="Chuyển sang giao diện tối"]');
      },
    },
  ],
  items: [
    {
      sel: '.brand', label: 'Logo Sweet Home', kind: 'Link', code: 'a.brand [routerLink="/tong-quan"]',
      note: 'Bấm về Tổng quan. iPad (≤ 1100px) chỉ còn icon.',
    },
    ...MENU_LABELS.map(([label, path, icon], i) => ({
      sel: `.nav a:nth-child(${i + 1})`, label: `Menu: ${label}`, kind: 'Link menu', code: `MENU[${i}] → ${path}`,
      note: `Icon ${icon}. Mục đang mở tô nền xanh (routerLinkActive="active", aria-current="page").`,
    })),
    {
      sel: '.top p-button:first-child', label: 'Nút giao diện sáng / tối', kind: 'Nút icon', code: 'theme.toggle()',
      note: 'Icon mặt trăng khi đang sáng, mặt trời khi đang tối. Lưu localStorage (khoá sh-theme); lần đầu theo cài đặt hệ điều hành (prefers-color-scheme).',
    },
    {
      sel: '.ntf-wrap', label: 'Chuông thông báo + số đếm', kind: 'Nút icon + huy hiệu', code: 'toggleNotifications() · views().length', badge: 'bottom',
      note: 'Số cam = số việc cần xử lý (ẩn khi 0). Bấm mở/đóng bảng thông báo (ảnh 2).',
    },
    {
      sel: '.top a[routerLink="/don-thue/tao-moi"]', label: 'Tạo đơn thuê', kind: 'Nút chính (link)', code: 'routerLink="/don-thue/tao-moi"',
      note: 'Mở màn Tạo đơn (file 08). Có ở mọi màn.',
    },
    {
      sel: '.top .user', label: 'Tài khoản đang đăng nhập', kind: 'Chữ', code: 'auth.currentUser().fullName · ROLE_LABEL[role]',
      note: 'Họ tên và vai trò (Quản lý / Nhân viên). Ẩn trên iPad.',
    },
    {
      sel: '.top p-button:last-child', label: 'Đăng xuất', kind: 'Nút icon', code: 'logout()', badge: 'right',
      note: 'Gọi POST /auth/logout (thu hồi refresh token, xoá cookie) rồi về /dang-nhap; lỗi API vẫn xoá thông tin tài khoản phía trình duyệt.',
    },
    {
      sel: 'main.content', label: 'Vùng nội dung', kind: 'Vùng', code: '<router-outlet>', badge: 'inside',
      note: 'Màn đang mở theo route (ở đây là Tổng quan — file 04).',
    },
    {
      shot: 'notify', sel: '.ntf-h', label: 'Tiêu đề bảng thông báo', kind: 'Chữ + tag', code: '.ntf-h',
      note: '"Thông báo" + "N việc cần xử lý".',
    },
    {
      shot: 'notify', sel: '.ntf-i.w >> nth=0', label: 'Thông báo phòng quá giờ', kind: 'Dòng thông báo (cam)', code: "kind = 'OVERSTAY'",
      note: 'Tiêu đề "Phòng {số} quá giờ {thời lượng}"; mô tả "{khách} · hẹn trả {giờ}". Nút: Trả phòng (action=checkout), Gia hạn (action=extend).',
    },
    {
      shot: 'notify', sel: '.ntf-i.p', label: 'Thông báo chờ xác nhận trả', kind: 'Dòng thông báo (tím)', code: "kind = 'PENDING_CHECKOUT'",
      note: '"Chờ xác nhận trả · P{số}"; "{khách} · khách tự check-out, tự chuyển lúc {giờ}". Nút: Xác nhận trả phòng (action=checkout).',
    },
    {
      shot: 'notify', sel: '.ntf-i:has(.pi-key)', label: 'Thông báo chưa gửi mã cửa', kind: 'Dòng thông báo (cam)', code: "kind = 'DOOR_CODE_NOT_SENT'",
      note: '"Chưa gửi mã cửa · P{số}"; "{khách} · nhận phòng {giờ}, còn {thời lượng}". Nút: Sao chép tin nhắn (action=copy).',
    },
    {
      shot: 'notify', sel: '.ntf-i.c >> nth=0', label: 'Thông báo thiếu nhân viên trực', kind: 'Dòng thông báo (đỏ)', code: "kind = 'UNCOVERED'",
      note: 'Chỉ Quản lý. "Thiếu nhân viên trực · {thứ} {dd/MM}"; "{mã đơn} (P{số}) nhận phòng {giờ} cần nhân viên đón, chưa ai trực lúc đó". Nút: Mở lịch làm (/lich-lam?date=…).',
    },
    {
      shot: 'notify', sel: '.ntf-f', label: 'Chân bảng', kind: 'Chữ (tĩnh)', code: '.ntf-f',
      note: '"Tự cập nhật mỗi phút. Thông báo tự mất khi việc đã được xử lý."',
    },
  ],
  logic: [
    { title: 'LOGIC KHUNG ỨNG DỤNG' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Shell là route cha của mọi màn sau đăng nhập, có canActivateChild: authGuard — chạy lại mỗi lần chuyển màn: chưa đăng nhập → /dang-nhap?redirect=<url>; mustChangePassword → /doi-mat-khau.',
        'Thông tin tài khoản lấy từ AuthService.currentUser (nạp bằng GET /auth/me khi mở lại app).',
        'Thông báo: gọi GET /api/notifications ngay khi vào và lặp lại mỗi 60 giây (interval + startWith). Một lần lỗi (mất mạng, hết phiên) bị bỏ qua, lần sau vẫn hỏi lại.',
        'Mọi request API qua auth.interceptor: gặp 401 thì tự gọi POST /auth/refresh (gộp các lần gọi đồng thời thành một) rồi gửi lại request một lần; refresh lỗi thì để lỗi đi tiếp, lần chuyển màn sau guard đưa về Đăng nhập.',
      ],
    },
    { h: '2. Bảng thông báo (nút chuông)' },
    {
      list: [
        'Bấm chuông: mở/đóng bảng; khi mở thì tải lại thông báo ngay.',
        'Đóng khi bấm ra ngoài bảng hoặc nhấn Esc (HostListener document:click, document:keydown.escape). Bấm trong bảng không đóng.',
        'Bấm nút xử lý nhanh: đóng bảng và chuyển tới /don-thue?id={đơn}&action=checkout|extend|copy (chi tiết đơn tự mở form trả phòng / dialog gia hạn / sao chép tin nhắn — file 07, 09) hoặc /lich-lam?date={ngày}.',
        'Thông báo là việc cần làm tính từ trạng thái hiện tại, không có đã đọc/chưa đọc; việc xử lý xong thì tự mất ở lần tải sau. Không có thông báo: "Không có việc nào cần xử lý."',
        'Thứ tự: theo loại (quá giờ → chờ xác nhận trả → chưa gửi mã cửa → thiếu nhân viên trực), cùng loại theo giờ.',
      ],
    },
    { h: '3. Điều kiện từng loại thông báo (DashboardService.notifications)' },
    {
      table: {
        cols: [{ h: 'Loại', w: 6 }, { h: 'Điều kiện', w: 18 }, { h: 'Ai thấy', w: 4 }, { h: 'Giờ hiển thị', w: 4 }],
        rows: [
          ['Phòng quá giờ (OVERSTAY)', 'Đơn ở trạng thái Quá giờ', 'Mọi vai trò', 'Giờ hẹn trả'],
          ['Chờ xác nhận trả (PENDING_CHECKOUT)', 'Đơn ở trạng thái Chờ xác nhận trả', 'Mọi vai trò', 'Giờ hẹn trả'],
          ['Chưa gửi mã cửa (DOOR_CODE_NOT_SENT)', 'Đơn Đã đặt, khách tự check-in, giờ nhận trong [bây giờ, bây giờ + 2 giờ], chưa có nhật ký DOOR_CODE_COPIED (chưa sao chép tin nhắn có {ma_cua})', 'Mọi vai trò', 'Giờ nhận'],
          ['Thiếu nhân viên trực (UNCOVERED)', 'Đơn chưa huỷ, nhân viên đón, giờ nhận trong 7 ngày tới, không nằm trong ca nào của tài khoản đang hoạt động (ScheduleService.coverage)', 'Chỉ Quản lý', 'Giờ nhận'],
        ],
      },
    },
    { note: 'Giờ hiển thị dạng HH:mm nếu cùng ngày, khác ngày thì dd/MM HH:mm. Thời lượng: "50 phút", "2 giờ 10 phút", "3 ngày".' },
    { h: '4. Dark mode và iPad' },
    {
      list: [
        'ThemeService bật/tắt class app-dark trên thẻ <html> (PrimeNG darkModeSelector); lưu lựa chọn trong localStorage, lần đầu theo prefers-color-scheme của hệ điều hành. Màn Đăng nhập có nút riêng, dùng chung lựa chọn.',
        'Màn hình ≤ 1100px (iPad): menu trái thu còn cột icon 76px (ẩn chữ menu, chữ thương hiệu, tên tài khoản); di chuột/giữ vào icon hiện tên mục (title).',
      ],
    },
    { h: '5. Đăng xuất' },
    {
      list: [
        'POST /api/auth/logout: thu hồi refresh token trong DB, trả cookie rỗng để xoá access_token/refresh_token.',
        'Frontend xoá currentUser (kể cả khi API lỗi) rồi chuyển /dang-nhap.',
      ],
    },
  ],
};
