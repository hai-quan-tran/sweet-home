// Nội dung file 04_TongQuan.xlsx: màn Tổng quan.
import { FIRST_VERSION, ROLES } from '../common.mjs';

/** Mở Tổng quan, chờ số liệu hiện. */
const open = async (page, ctx) => {
  await ctx.open(page, '/tong-quan');
  await page.locator('.kpi').first().waitFor();
};
const room = (tagText) => `.room:has(.tag:has-text("${tagText}")) >> nth=0`;

export default {
  file: '04_TongQuan',
  title: 'Tổng quan',
  kind: 'Màn hình',
  route: '/tong-quan (cũng là màn mặc định sau đăng nhập, route "/" chuyển tới đây)',
  summary: 'Bức tranh trong ngày: chỉ số hôm nay, tình trạng từng phòng, việc cần làm hôm nay kèm nút xử lý nhanh, doanh thu 7 ngày (chỉ Quản lý), cơ cấu đơn và công suất phòng của tháng. Tự cập nhật mỗi phút.',
  access: ['Sau khi đăng nhập (mặc định).', 'Menu trái → Tổng quan, hoặc bấm logo Sweet Home.'],
  roles: `${ROLES.all}. Nhân viên không thấy doanh thu (chỉ số "Doanh thu hôm nay" và biểu đồ "Doanh thu 7 ngày") — backend không trả dữ liệu này cho Nhân viên.`,
  related: ['03_KhungUngDung', '05_LichDatPhong', '07_ChiTietDon (nút xử lý nhanh)', '00_TongThe (trạng thái đơn)'],
  sources: [
    'frontend/src/app/pages/dashboard/dashboard-page.{ts,html,scss}',
    'frontend/src/app/core/dashboard.service.ts, dashboard.models.ts, time-format.ts',
    'backend/.../dashboard/DashboardController.java (GET /dashboard), DashboardService.overview, DashboardDto',
  ],
  history: FIRST_VERSION,
  shots: [
    { id: 'main', caption: 'Tổng quan (Quản lý)', go: open },
    { id: 'staff', caption: 'Tổng quan (Nhân viên): không có doanh thu', role: 'staff', go: open },
  ],
  items: [
    {
      sel: '.ph .page-desc', label: 'Dòng phụ dưới tiêu đề', kind: 'Chữ', code: 'subtitle (computed)',
      note: '"{Thứ}, dd/MM/yyyy · cập nhật lúc HH:mm · Đang trong ca: {Họ tên} ({tên ca}), …" — "chưa có ai" nếu không ai trong ca. Giờ lấy theo server (now).',
    },
    {
      sel: '.ph .btn-s', label: 'Xem lịch hôm nay', kind: 'Nút phụ (link)', code: 'routerLink="/lich"', badge: 'right',
      note: 'Mở Lịch đặt phòng (file 05), xem theo ngày hôm nay.',
    },
    {
      sel: '.kpi >> nth=0', label: 'Chỉ số: Phòng trống', kind: 'Thẻ số liệu', code: 'kpis()[0]', dataType: 'số',
      rule: 'Giá trị: số phòng trạng thái Trống và đang nhận đặt / tổng số phòng.',
      note: 'Dòng dưới: "{số các phòng trống} sẵn sàng" (hoặc "Hết phòng trống") · "{n} chờ dọn".',
    },
    {
      sel: '.kpi >> nth=1', label: 'Chỉ số: Đang có khách', kind: 'Thẻ số liệu', code: 'kpis()[1]', dataType: 'số',
      rule: 'Số phòng Đang ở + Quá giờ (không tính Chờ xác nhận trả).',
      note: 'Dòng dưới: "{n} phòng quá giờ trả" hoặc "Không phòng nào quá giờ".',
    },
    {
      sel: '.kpi >> nth=2', label: 'Chỉ số: Lượt nhận phòng hôm nay', kind: 'Thẻ số liệu', code: 'checkInsToday, checkedInToday', dataType: 'số',
      rule: 'Đơn chưa huỷ có giờ nhận trong hôm nay.',
      note: 'Dòng dưới: "{đã nhận} đã nhận · {còn lại} sắp tới" (đã nhận = trạng thái khác Đã đặt).',
    },
    {
      sel: '.kpi >> nth=3', label: 'Chỉ số: Doanh thu hôm nay', kind: 'Thẻ số liệu', code: 'revenue.at(-1)', dataType: 'tiền (VND)',
      rule: 'Chỉ Quản lý. Tổng tiền các đơn có giờ nhận hôm nay; đơn huỷ chỉ tính cọc giữ lại (đã thu − hoàn).',
      note: 'Định dạng 1.250.000đ. Dòng dưới: "Đã thu {tiền}" của các đơn đó.',
    },
    {
      sel: '.row2 >> nth=0 >> .card >> nth=0 >> .ch', label: 'Tình trạng phòng · Mở lịch', kind: 'Tiêu đề card + link', code: 'routerLink="/lich"',
      note: 'Card liệt kê mọi phòng theo số phòng tăng dần. "Mở lịch" mở Lịch đặt phòng.',
    },
    {
      sel: room('Đang ở'), label: 'Thẻ phòng Đang ở', kind: 'Thẻ phòng', code: "rooms()[i] · state = 'CHECKED_IN'",
      note: 'Số · tên phòng, tag xanh "Đang ở", hình thức check-in, tên khách (link mở đơn), "{giờ nhận} → {giờ trả} · còn {thời lượng}" (thuê qua đêm/ngày: "{loại thuê} · trả HH:mm, dd/MM"), thanh % thời gian đã ở.',
    },
    {
      sel: '.room.warn >> nth=0', label: 'Thẻ phòng Quá giờ', kind: 'Thẻ phòng (viền cam)', code: "state = 'OVERSTAY'",
      note: 'Tag "Quá giờ {thời lượng}", dòng "{giờ nhận} → {giờ trả} · đang tính phụ thu", thanh đầy màu cam.',
    },
    {
      sel: room('Chờ xác nhận trả'), label: 'Thẻ phòng Chờ xác nhận trả', kind: 'Thẻ phòng', code: "state = 'PENDING_CHECKOUT'",
      note: 'Đơn khách tự check-in đã tới giờ trả: "Tự chuyển lúc {giờ trả} · chờ xác nhận".',
    },
    {
      sel: room('Chờ dọn'), label: 'Thẻ phòng Chờ dọn', kind: 'Thẻ phòng', code: "state = 'CLEANING'",
      note: 'Phòng không có khách, cần dọn (needs_cleaning). Dòng giờ: khách kế tiếp hoặc "Chưa có khách đặt tiếp".',
    },
    {
      sel: room('Trống'), label: 'Thẻ phòng Trống', kind: 'Thẻ phòng', code: "state = 'EMPTY'",
      note: '"Chưa có khách" (hoặc "Tạm ngừng nhận đặt" nếu phòng tắt nhận đặt); "Khách tiếp theo {giờ} · {tên}" nếu có đơn sắp tới. Hình thức check-in lấy theo đơn kế tiếp, không có thì theo mặc định của phòng.',
    },
    {
      sel: '.row2 >> nth=0 >> .card >> nth=1 >> .ch .tag', label: 'Việc cần làm hôm nay · số việc', kind: 'Tag', code: 'tasks().length', badge: 'right',
      note: 'Chỉ việc chưa xong, sắp theo giờ. Không còn việc: "Không còn việc nào hôm nay."',
    },
    {
      sel: '.ag.w >> nth=0', label: 'Việc: Trả phòng quá giờ', kind: 'Dòng việc (cam)', code: "kind = 'OVERSTAY'",
      note: '"Trả phòng · quá {thời lượng}"; "P{số} · thu {tiền}". Nút "Trả phòng" → action=checkout.',
    },
    {
      sel: '.ag.p >> nth=0', label: 'Việc: Xác nhận trả phòng', kind: 'Dòng việc (tím)', code: "kind = 'CONFIRM_CHECKOUT'",
      note: 'Giờ hẹn trả; "P{số} · khách tự trả · thu {còn phải thu}". Nút "Xác nhận" → /don-thue?id=…&action=checkout.',
    },
    {
      sel: '.ag:has(a:has-text("Gửi mã")) >> nth=0', label: 'Việc: Nhận phòng (chưa gửi mã)', kind: 'Dòng việc', code: "kind = 'CHECK_IN'",
      note: '"P{số} · tự nhận · chưa gửi mã" (chữ cam) + nút "Gửi mã" → action=copy (sao chép tin nhắn). Đơn nhân viên đón: "NV {tên} / chưa có NV trực" (cam nếu chưa có ai trực).',
    },
    {
      sel: '.ag.out >> nth=0', label: 'Việc: Trả phòng hôm nay', kind: 'Dòng việc', code: "kind = 'CHECK_OUT'",
      note: 'Đơn đang ở có giờ trả trong hôm nay: "P{số} · {NV trực / tự nhận} · thu {tiền}". Không có nút.',
    },
    {
      sel: '.chart', label: 'Doanh thu 7 ngày', kind: 'Biểu đồ cột', code: 'chart (computed)', dataType: 'tiền (VND)',
      rule: 'Chỉ Quản lý. 6 ngày trước + hôm nay, theo ngày nhận phòng.',
      note: 'Số trên cột rút gọn (1,25tr / 350k); chiều cao theo ngày cao nhất; cột hôm nay tô đậm. Tiêu đề card có "Tổng {tiền}".',
    },
    {
      sel: '.cb .legend', label: 'Đơn thuê tháng · cơ cấu theo loại thuê', kind: 'Thanh tỉ lệ + chú thích', code: 'mix (computed)', dataType: 'số, %',
      rule: 'Đơn chưa huỷ có giờ nhận trong tháng hiện tại (kể cả đơn đặt cho ngày tới).',
      note: 'Theo giờ / Qua đêm / Theo ngày: "{số đơn} · {%}". Tiêu đề "Đơn thuê tháng {M}" + "{tổng} đơn".',
    },
    {
      sel: '.occ', label: 'Công suất phòng', kind: 'Thanh %', code: 'occupancyPercent', dataType: '%',
      rule: 'Số phút có khách (chặng của đơn chưa huỷ) từ 00:00 ngày 1 đến bây giờ / (số phòng đang nhận đặt × số phút đó), tối đa 100%.',
    },
    {
      shot: 'staff', sel: '.kpis', label: 'Chỉ số (Nhân viên)', kind: 'Hàng thẻ số liệu', code: 'kpis().length === 3 (class k3)',
      note: 'Nhân viên chỉ có 3 chỉ số, không có Doanh thu hôm nay.',
    },
    {
      shot: 'staff', sel: '.row2.single', label: 'Hàng biểu đồ (Nhân viên)', kind: 'Card', code: 'row2.single',
      note: 'Không có biểu đồ Doanh thu 7 ngày; card Đơn thuê tháng chiếm cả hàng.',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN TỔNG QUAN' },
    { h: '1. Khởi tạo và tự cập nhật' },
    {
      list: [
        'Vào màn: gọi GET /api/dashboard; sau đó gọi lại mỗi 60 giây khi còn ở màn (không cần bấm làm mới).',
        'Backend lấy vai trò từ tài khoản đăng nhập: Nhân viên nhận revenue = null (ẩn ở backend, không chỉ ẩn trên giao diện).',
        'Mọi chữ, %, "còn 50 phút", "quá 25 phút" tính ở frontend từ dữ liệu trả về theo giờ server (now, đã bỏ phần lẻ giây để Safari trên iPad đọc được).',
      ],
    },
    { h: '2. Dữ liệu trả về (DashboardDto)' },
    {
      table: {
        cols: [{ h: 'Trường', w: 6 }, { h: 'Cách tính (DashboardService.overview)', w: 26 }],
        rows: [
          ['now', 'Giờ hiện tại của server (Asia/Ho_Chi_Minh).'],
          ['onShift', 'Người đang trong ca: ca hôm nay của tài khoản đang hoạt động có [bắt đầu, kết thúc) chứa bây giờ.'],
          ['rooms', 'Mọi phòng theo số phòng. Có đơn đang ở (Đang ở / Quá giờ / Chờ xác nhận trả) ở phòng đó → trạng thái của đơn; phòng của đơn = chặng mới nhất đã bắt đầu (đơn vừa gia hạn chuyển phòng vẫn tính ở phòng cũ tới khi chặng cũ kết thúc). Không có → Chờ dọn (needs_cleaning) hoặc Trống. Kèm khách kế tiếp (chặng Đã đặt sớm nhất chưa kết thúc).'],
          ['checkInsToday / checkedInToday', 'Số đơn chưa huỷ có giờ nhận hôm nay / số đơn trong đó đã khác Đã đặt.'],
          ['tasks', 'Việc chưa xong hôm nay, sắp theo giờ: CONFIRM_CHECKOUT (đơn Chờ xác nhận trả), OVERSTAY (đơn Quá giờ), CHECK_OUT (đơn Đang ở có giờ trả trước 00:00 ngày mai), CHECK_IN (đơn Đã đặt có giờ nhận hôm nay). Kèm còn phải thu, người trực lúc đó (đơn nhân viên đón), đã gửi mã cửa chưa (đơn khách tự check-in — có nhật ký DOOR_CODE_COPIED).'],
          ['revenue', 'Chỉ Quản lý. 7 ngày đến hôm nay theo ngày nhận phòng: đơn chưa huỷ cộng tổng tiền, đơn huỷ cộng cọc giữ lại (đã thu − hoàn); paid = đã thu.'],
          ['monthOrders', 'Số đơn chưa huỷ có giờ nhận trong tháng, theo loại thuê (luôn đủ 3 khoá).'],
          ['occupancyPercent', 'Phút có khách của các chặng (đơn chưa huỷ) trong [00:00 ngày 1, bây giờ) / (số phòng đang nhận đặt × số phút), làm tròn, tối đa 100.'],
        ],
      },
    },
    { h: '3. Hành động' },
    {
      table: {
        cols: [{ h: 'Bấm', w: 8 }, { h: 'Kết quả', w: 24 }],
        rows: [
          ['Xem lịch hôm nay / Mở lịch', 'Chuyển /lich (file 05).'],
          ['Tên khách trên thẻ phòng / trong việc cần làm', 'Chuyển /don-thue?id={đơn}: màn Đơn thuê mở sẵn chi tiết đơn (file 06, 07).'],
          ['Xác nhận / Trả phòng', '/don-thue?id={đơn}&action=checkout: chi tiết đơn tự mở form trả phòng.'],
          ['Gửi mã', '/don-thue?id={đơn}&action=copy: chi tiết đơn tự sao chép tin nhắn theo mẫu mặc định (có mã cửa → ghi nhật ký DOOR_CODE_COPIED, việc đổi thành "đã gửi mã").'],
        ],
      },
    },
    { note: 'Màn chỉ đọc dữ liệu, không ghi nhật ký. Bố cục: hàng tình trạng phòng / việc cần làm chia 2:1 (≤ 1366px: 3:2); thẻ phòng 3 cột (≤ 1500px: 2 cột); ≤ 860px các card xếp dọc, chỉ số 2 cột.' },
  ],
};
