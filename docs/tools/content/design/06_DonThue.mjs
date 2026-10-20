// Nội dung file 06_DonThue.xlsx: màn Đơn thuê (danh sách, lọc, tìm kiếm).
import { ROLES, fixVersion } from '../common.mjs';

/** Mở màn Đơn thuê, chờ bảng có dữ liệu. */
const open = async (page, ctx, query = '') => {
  await ctx.open(page, '/don-thue' + query);
  await page.locator('.tbl tbody tr').first().waitFor();
};

export default {
  file: '06_DonThue',
  title: 'Đơn thuê',
  kind: 'Màn hình',
  route: '/don-thue (tuỳ chọn ?id={id đơn}&action=copy|checkout|extend)',
  summary: 'Danh sách mọi đơn, lọc theo trạng thái (tab có số đếm), theo phòng, tìm theo mã đơn / tên / SĐT khách, phân trang 10 đơn. Bấm một dòng để mở chi tiết đơn ở cột phải (file 07).',
  access: [
    'Menu trái → Đơn thuê.',
    'Link tên khách / nút xử lý nhanh ở Tổng quan, bảng thông báo, nhật ký thao tác (mở sẵn đơn qua ?id=).',
    'Sau khi lưu đơn ở màn Tạo/Sửa đơn.',
  ],
  roles: ROLES.all,
  related: ['07_ChiTietDon', '08_TaoSuaDon', '04_TongQuan', '03_KhungUngDung (thông báo)'],
  sources: [
    'frontend/src/app/pages/orders/orders-page.{ts,html,scss}',
    'frontend/src/app/core/order.service.ts (list), order-labels.ts',
    'backend/.../order/OrderController.java (GET /orders), OrderService.list, RentalOrderRepository.search / countByStatus',
  ],
  history: fixVersion('Số trên tab "Tất cả" luôn là tổng đơn mọi trạng thái (trước đây lấy total của tab đang chọn).'),
  shots: [
    { id: 'list', caption: 'Danh sách đơn (tab Tất cả)', go: (page, ctx) => open(page, ctx) },
    {
      id: 'selected',
      caption: 'Đang chọn một đơn: chi tiết hiện ở cột phải',
      fullPage: false,
      go: async (page, ctx) => {
        await open(page, ctx, `?id=${ctx.order.staying}`);
        await page.locator('app-order-detail .dp-h').waitFor();
      },
    },
    {
      id: 'search',
      caption: 'Lọc tab Đã đặt + tìm kiếm',
      fullPage: false,
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.click('.tabs button:has-text("Đã đặt")');
        await page.fill('.search input', 'Ngọc');
        await page.waitForLoadState('networkidle');
      },
    },
  ],
  items: [
    { sel: '.ph a.btn-p', label: 'Tạo đơn thuê', kind: 'Nút chính (link)', code: 'routerLink="/don-thue/tao-moi"', badge: 'right', note: 'Mở màn Tạo đơn (file 08).' },
    {
      sel: '.tabs', label: 'Tab trạng thái + số đếm', kind: 'Nhóm tab', code: 'STATUS_TABS · statusFilter · setStatus()',
      dataType: 'OrderStatus | null', default: 'Tất cả',
      note: 'Tất cả · Đã đặt · Đang ở · Quá giờ · Chờ xác nhận · Đã trả · Đã huỷ. Số đếm theo bộ lọc phòng + ô tìm kiếm hiện tại (không theo tab); tab Tất cả = tổng số của mọi trạng thái (sheet 4). Đổi tab về trang 1.',
    },
    {
      sel: '.search', label: 'Ô tìm kiếm', kind: 'Ô nhập (search)', code: 'search · onSearch()', dataType: 'string', required: 'Không',
      rule: 'Tìm gần đúng tên khách (không phân biệt hoa thường) hoặc SĐT (chuỗi con, đúng như đã nhập kể cả khoảng trắng); nhập đúng mã đơn "SH-1036" (không phân biệt hoa thường) thì tìm theo mã.',
      default: '(trống)', note: 'Placeholder "Mã đơn, tên hoặc SĐT khách". Tìm ngay mỗi lần gõ, về trang 1.',
    },
    {
      sel: '.filters .sel', label: 'Lọc phòng', kind: 'Ô chọn', code: 'roomFilter · setRoomFilter()', dataType: 'id phòng | null', required: 'Không',
      default: 'Tất cả phòng', note: 'Danh sách "{số} · {tên}" mọi phòng. Lọc theo phòng hiện tại của đơn (phòng của chặng cuối).',
    },
    {
      sel: '.tbl thead', label: 'Tiêu đề bảng', kind: 'Bảng', code: 'listResponse().items',
      note: 'Sắp theo giờ nhận phòng giảm dần (đơn nhận muộn nhất ở trên). Trên iPad bảng cuộn ngang trong card.',
    },
    {
      sel: '.tbl tbody tr >> nth=0 >> td >> nth=0', label: 'Khách · mã đơn', kind: 'Ô bảng', code: 'guestName · code · guestPhone',
      note: 'Tên khách (đậm), dòng dưới "SH-xxxx · SĐT".',
    },
    {
      sel: '.tbl tbody tr >> nth=0 >> td >> nth=1', label: 'Phòng', kind: 'Ô bảng', code: 'roomNumber · rentalType · checkInMode',
      note: 'Số phòng; dòng dưới "{Theo giờ / Qua đêm / Theo ngày} · {tự nhận / NV đón}".',
    },
    {
      sel: '.tbl tbody tr >> nth=0 >> td >> nth=2', label: 'Thời gian', kind: 'Ô bảng', code: 'checkInAt → checkOutAt',
      rule: '"HH:mm → HH:mm" (giờ nhận → giờ trả hẹn), dòng dưới "dd/MM → dd/MM".',
    },
    { sel: '.tbl tbody tr >> nth=0 >> td >> nth=3', label: 'Tổng tiền', kind: 'Ô bảng (số)', code: 'totalAmount', dataType: 'tiền (VND)', rule: 'Định dạng 1.250.000đ, căn phải.' },
    { sel: '.tbl tbody tr >> nth=0 >> td >> nth=4', label: 'Trạng thái', kind: 'Tag', code: 'STATUS_TAG[status]', note: 'Màu như chú thích ở Lịch đặt phòng; Đã huỷ màu đỏ.' },
    {
      sel: '.pager', label: 'Phân trang', kind: 'Chữ + nút', code: 'page · setPage() · PAGE_SIZE = 10',
      note: '"Hiển thị a–b trên N đơn"; nút trang trước / số trang hiện tại / trang sau (khoá ở trang đầu/cuối). Chỉ hiện khi có đơn.',
    },
    {
      shot: 'selected', sel: '.tbl tr.sel', label: 'Dòng đang chọn', kind: 'Dòng bảng (tô nền)', code: 'selectedId · selectOrder()',
      note: 'Bấm dòng: mở chi tiết, URL đổi thành ?id={id} (giữ khi tải lại trang, chia sẻ được), bỏ action.',
    },
    {
      shot: 'selected', sel: 'app-order-detail', label: 'Chi tiết đơn', kind: 'Component dùng chung', code: '<app-order-detail [orderId] [autoAction]> (changed)="reload()"', badge: 'inside',
      note: 'Xem file 07. Thao tác xong (nhận/trả phòng, huỷ, gia hạn) danh sách tải lại.',
    },
    {
      shot: 'search', sel: '.tabs button.active', label: 'Tab đang chọn', kind: 'Tab', code: 'statusFilter = BOOKED',
      note: 'Bảng chỉ còn đơn trạng thái Đã đặt khớp ô tìm kiếm; số trên các tab đổi theo ô tìm kiếm.',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN ĐƠN THUÊ' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Gọi GET /api/rooms (cho ô lọc phòng) và GET /api/orders?page=0&size=10 (tab Tất cả).',
        'Theo dõi query param của URL (cả khi đang ở màn): có id → mở chi tiết đơn đó; có action (copy | checkout | extend) → chi tiết tự làm hành động sau khi tải (file 07).',
      ],
    },
    { h: '2. Tải danh sách — GET /api/orders' },
    {
      table: {
        cols: [{ h: 'Tham số', w: 5 }, { h: 'Giá trị', w: 27 }],
        rows: [
          ['status', 'Trạng thái của tab (bỏ trống = Tất cả).'],
          ['roomId', 'Phòng đang lọc (so với phòng hiện tại của đơn).'],
          ['search', 'Chuỗi tìm kiếm; backend trim + chữ thường. Khớp "SH-{số}" → tìm thêm theo id = số − 1000.'],
          ['page, size', 'Trang (từ 0) và 10 đơn/trang; backend giới hạn size tối đa 100.'],
        ],
      },
    },
    {
      p: 'Kết quả: items (OrderDto, sắp giờ nhận giảm dần), total (tổng số đơn khớp bộ lọc + tab), countByStatus (số đơn theo từng trạng thái, áp bộ lọc phòng + tìm kiếm, không áp tab). Số trên các tab trạng thái lấy từ countByStatus; số trên tab "Tất cả" = tổng các giá trị countByStatus (allCount), không phụ thuộc tab đang chọn. total chỉ dùng tính số trang.',
    },
    { h: '3. Hành động' },
    {
      table: {
        cols: [{ h: 'Thao tác', w: 7 }, { h: 'Kết quả', w: 25 }],
        rows: [
          ['Bấm tab / đổi phòng / gõ tìm kiếm', 'Về trang 1, tải lại danh sách.'],
          ['Trang trước / sau', 'Tải trang tương ứng (không vượt trang đầu/cuối).'],
          ['Bấm một dòng', 'Mở chi tiết đơn ở cột phải, cập nhật URL ?id=.'],
          ['Tạo đơn thuê', 'Chuyển /don-thue/tao-moi.'],
        ],
      },
    },
    { note: 'Đang tải hiện "Đang tải...", không có đơn hiện "Chưa có đơn nào.". Màn chỉ đọc dữ liệu, không ghi nhật ký.' },
  ],
};
