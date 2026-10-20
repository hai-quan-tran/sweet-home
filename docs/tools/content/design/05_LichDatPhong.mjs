// Nội dung file 05_LichDatPhong.xlsx: màn Lịch đặt phòng.
import { FIRST_VERSION, ROLES } from '../common.mjs';

/** Mở Lịch, chờ các khối đơn hiện. */
const open = async (page, ctx) => {
  await ctx.open(page, '/lich');
  await page.locator('.bk').first().waitFor();
};

export default {
  file: '05_LichDatPhong',
  title: 'Lịch đặt phòng',
  kind: 'Màn hình',
  route: '/lich',
  summary: 'Timeline phòng × thời gian theo ngày (24 giờ), tuần, tháng: mỗi đơn là một khối màu theo trạng thái. Bấm khối để xem chi tiết đơn ngay bên dưới; bấm vùng trống của một phòng để tạo đơn điền sẵn phòng và giờ. Tự cập nhật mỗi phút.',
  access: ['Menu trái → Lịch đặt phòng.', 'Tổng quan → "Xem lịch hôm nay" hoặc "Mở lịch".'],
  roles: ROLES.all,
  related: ['07_ChiTietDon (chi tiết đơn bên dưới lịch)', '08_TaoSuaDon (bấm ô trống)', '09_GiaHan', '00_TongThe (chặng của đơn)'],
  sources: [
    'frontend/src/app/pages/calendar/calendar-page.{ts,html,scss}',
    'frontend/src/app/core/order.service.ts (stays), room.service.ts (list), order-labels.ts (STATUS_TAG)',
    'backend/.../order/OrderController.java (GET /orders/stays), OrderService.stays, OrderStayDto; room/RoomController (GET /rooms)',
  ],
  history: FIRST_VERSION,
  shots: [
    {
      id: 'day',
      caption: 'Xem theo ngày, đang chọn một đơn',
      note: 'Chi tiết đơn đang chọn hiện dưới lịch (mô tả ở file 07).',
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.click('.bk:has-text("Nguyễn Thị Mai")');
        await page.locator('app-order-detail .dp-h').waitFor();
      },
    },
    {
      id: 'week',
      caption: 'Xem theo tuần',
      fullPage: false,
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.click('.seg button:has-text("Tuần")');
        await page.locator('.bk:has-text("Võ Đăng Khoa")').waitFor();
      },
    },
  ],
  items: [
    {
      sel: '.seg', label: 'Kiểu xem: Ngày / Tuần / Tháng', kind: 'Nhóm nút chọn', code: 'view (signal) · setView()', dataType: "'day' | 'week' | 'month'",
      default: 'Ngày', note: 'Nút đang chọn có aria-pressed="true". Đổi kiểu xem giữ ngày đang xem (anchor) và tải lại.',
    },
    {
      sel: '.dnav .ibtn >> nth=0', label: 'Trước', kind: 'Nút icon', code: 'shift(-1)',
      note: 'Lùi 1 ngày / 1 tuần / 1 tháng theo kiểu xem.',
    },
    { sel: '.dnav .btn-s', label: 'Hôm nay', kind: 'Nút phụ', code: 'goToday()', note: 'Về ngày hôm nay (giữ kiểu xem).' },
    { sel: '.dnav .ibtn >> nth=1', label: 'Sau', kind: 'Nút icon', code: 'shift(1)', note: 'Tiến 1 ngày / 1 tuần / 1 tháng.' },
    {
      sel: '.dnav strong', label: 'Khoảng đang xem', kind: 'Chữ', code: 'title (computed)',
      rule: 'Ngày: "{Thứ}, dd/MM/yyyy" · Tuần (từ thứ Hai): "dd/MM – dd/MM/yyyy" · Tháng: "Tháng M/yyyy".',
    },
    {
      sel: '.legend', label: 'Chú thích màu trạng thái', kind: 'Tag', code: 'LEGEND · STATUS_TAG', badge: 'right',
      note: 'Đã đặt (xanh dương) · Đang ở (xanh lá) · Quá giờ (cam) · Chờ xác nhận (tím) · Đã trả (xám). Đơn đã huỷ không hiện trên lịch.',
    },
    {
      sel: '.tl-head', label: 'Hàng tiêu đề thời gian', kind: 'Tiêu đề cột', code: 'columns (computed)',
      rule: 'Ngày: 24 cột 00–23 · Tuần: 7 cột "T2 dd/MM" … "CN dd/MM" · Tháng: 1 cột mỗi ngày.',
      note: 'Lịch có bề rộng tối thiểu (ngày 1100px, tuần 900px, tháng 1300px); màn hẹp hơn thì cuộn ngang, cột Phòng đứng yên.',
    },
    {
      sel: '.tl-room >> nth=0', label: 'Cột phòng', kind: 'Chữ', code: 'rows()[i].room',
      note: 'Số · tên phòng; hình thức check-in mặc định của phòng (Tự check-in / Nhân viên). Mỗi phòng một dòng.',
    },
    {
      sel: '.tl-room:has(.tag.t-w)', label: 'Tag Chờ dọn', kind: 'Tag', code: 'room.needsCleaning', badge: 'right',
      note: 'Phòng cần dọn (sau trả phòng / khách chuyển đi). Vẫn tạo đơn được.',
    },
    {
      sel: '.tl-row:has(.tag.t-o)', label: 'Phòng tắt nhận đặt', kind: 'Dòng phòng (nền gạch)', code: '!room.acceptingBookings · .track.off',
      note: 'Tag "Tắt nhận đặt"; vùng thời gian không bấm được (title "Phòng đang tắt nhận đặt").',
    },
    {
      sel: '.bk.sel', label: 'Khối đơn đang chọn', kind: 'Nút (khối đơn)', code: 'select(orderId) · .bk.sel',
      note: 'Tên khách + "HH:mm – HH:mm" (khác ngày: "HH:mm dd/MM → HH:mm dd/MM"); màu theo trạng thái; di chuột hiện "{mã đơn} · {khách} · {giờ}". Bấm: mở chi tiết; bấm lại đơn đang mở: đóng.',
    },
    {
      sel: '.over >> nth=0', label: 'Phần quá giờ', kind: 'Vạch nét đứt', code: 'block.over',
      note: 'Đơn Quá giờ: từ giờ hẹn trả đến bây giờ.',
    },
    {
      sel: '.bk.t-b >> nth=0', label: 'Khối đơn Đã đặt', kind: 'Nút (khối đơn)', code: "STATUS_TAG.BOOKED.cls = 't-b'",
      note: 'Khối cắt ở mép khoảng đang xem (đơn bắt đầu trước / kết thúc sau) có góc vuông ở mép đó (cont-l / cont-r).',
    },
    {
      sel: '.bk.t-o >> nth=0', label: 'Khối đơn Đã trả', kind: 'Nút (khối đơn)', code: "STATUS_TAG.CHECKED_OUT.cls = 't-o'",
    },
    {
      sel: '.tl-row:has-text("104 ·") .track', label: 'Vùng thời gian của phòng (ô trống)', kind: 'Vùng bấm', code: 'createAt(room, $event)', badge: 'inside',
      note: 'Bấm chỗ trống → /don-thue/tao-moi?roomId=…&date=YYYY-MM-DD (xem theo ngày thêm &time=HH:00 — giờ tròn tại vị trí bấm).',
    },
    {
      sel: '.now', label: 'Vạch "bây giờ"', kind: 'Vạch dọc + giờ', code: 'nowPercent · nowLabel',
      note: 'Chỉ hiện khi bây giờ nằm trong khoảng đang xem. Vào màn / đổi khoảng tự cuộn ngang để vạch nằm giữa.',
    },
    {
      sel: 'app-order-detail', label: 'Chi tiết đơn đang chọn', kind: 'Component dùng chung', code: '<app-order-detail [orderId]> (changed)="load()"', badge: 'inside',
      note: 'Xem file 07. Sau nhận/trả phòng, huỷ, gia hạn: lịch tải lại.',
    },
    {
      shot: 'week', sel: '.tl-head .cols', label: 'Cột ngày trong tuần', kind: 'Tiêu đề cột', code: 'columns (week)',
      note: 'Tuần bắt đầu thứ Hai. Xem theo tuần/tháng bấm ô trống chỉ điền sẵn ngày (không điền giờ).',
    },
    {
      shot: 'week', sel: '.bk:has-text("Võ Đăng Khoa")', label: 'Đơn nhiều ngày', kind: 'Nút (khối đơn)', code: 'toBlock()',
      note: 'Vị trí và độ dài khối = % thời gian trong khoảng đang xem (tính ở frontend).',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN LỊCH ĐẶT PHÒNG' },
    { h: '1. Khởi tạo và tải dữ liệu' },
    {
      list: [
        'Mặc định xem theo ngày, ngày hôm nay. Gọi GET /api/rooms (danh sách phòng, sắp theo số phòng) một lần.',
        'Mỗi khi khoảng đang xem đổi: gọi GET /api/orders/stays?from=YYYY-MM-DDT00:00:00&to=… với [from, to) = ngày / tuần (thứ Hai → thứ Hai sau) / tháng; sau khi vẽ xong tự cuộn tới vạch bây giờ.',
        'Mỗi 60 giây: cập nhật vạch bây giờ và tải lại các chặng (trạng thái đơn do backend tự chuyển theo giờ).',
        'Backend: khoảng phải hợp lệ (to > from) và không quá 31 ngày, sai → 400 "Khoảng thời gian phải hợp lệ và không quá 31 ngày". Trả các chặng (order_stay) của đơn chưa huỷ giao với khoảng, mỗi chặng: mã đơn, phòng, trạng thái đơn, tên khách, giờ bắt đầu/kết thúc chặng.',
        'Đơn gia hạn có chuyển phòng có 2 chặng → hiện ở 2 dòng phòng tương ứng.',
      ],
    },
    { h: '2. Vẽ khối đơn (toBlock)' },
    {
      list: [
        'left = (max(bắt đầu chặng, from) − from) / (to − from) × 100%; width = phần nhìn thấy trong khoảng / (to − from) × 100%.',
        'Màu theo trạng thái đơn (STATUS_TAG): Đã đặt t-b, Đang ở t-i, Quá giờ t-w, Chờ xác nhận t-p, Đã trả t-o.',
        'Đơn Quá giờ: vẽ thêm phần nét đứt từ giờ hẹn trả tới bây giờ.',
      ],
    },
    { h: '3. Hành động' },
    {
      table: {
        cols: [{ h: 'Thao tác', w: 7 }, { h: 'Kết quả', w: 25 }],
        rows: [
          ['Bấm khối đơn', 'Mở chi tiết đơn dưới lịch (không làm co lịch); bấm lại đơn đang mở thì đóng.'],
          ['Bấm vùng trống của phòng đang nhận đặt', 'Chuyển /don-thue/tao-moi?roomId={id}&date={ngày tại vị trí bấm}[&time={giờ tròn}] — màn Tạo đơn điền sẵn phòng, ngày, giờ nhận (file 08).'],
          ['Bấm vùng của phòng tắt nhận đặt', 'Không làm gì.'],
          ['Ngày / Tuần / Tháng, Trước, Sau, Hôm nay', 'Đổi khoảng đang xem → tải lại chặng.'],
          ['Thao tác trong chi tiết đơn', 'Nhận/trả phòng, huỷ, gia hạn xong → chi tiết phát sự kiện changed → lịch tải lại.'],
        ],
      },
    },
    { note: 'Màn chỉ đọc dữ liệu, không ghi nhật ký (thao tác ở chi tiết đơn ghi nhật ký riêng — file 07).' },
  ],
};
