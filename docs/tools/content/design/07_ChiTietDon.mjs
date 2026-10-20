// Nội dung file 07_ChiTietDon.xlsx: chi tiết đơn (component dùng chung ở màn Đơn thuê và Lịch đặt phòng).
import { FIRST_VERSION, ROLES } from '../common.mjs';

const DETAIL = 'app-order-detail';
const MONEY = '.sec:has(h3:text-is("Tiền"))';
const CHECKOUT = '.sec:has(.manual)';
const CANCEL = '.sec:has(h3:text-is("Huỷ đơn"))';

/**
 * Mở màn Đơn thuê với đơn cho trước (có thể kèm action), chờ chi tiết tải xong.
 * @param {string} key khoá đơn trong ctx.order
 */
const openOrder = (key, action) => async (page, ctx) => {
  await ctx.open(page, `/don-thue?id=${ctx.order[key]}${action ? '&action=' + action : ''}`);
  await page.locator(`${DETAIL} .dp-h`).waitFor();
  await page.waitForLoadState('networkidle');
};

export default {
  file: '07_ChiTietDon',
  title: 'Chi tiết đơn',
  kind: 'Thành phần dùng chung (cột phải màn Đơn thuê, dưới lịch ở màn Lịch đặt phòng)',
  route: '/don-thue?id={id}[&action=copy|checkout|extend] hoặc chọn đơn ở /lich',
  summary: 'Xem đầy đủ một đơn (khách, phòng, giờ, chặng, mã cửa, tiền) và mọi thao tác vòng đời: nhận phòng, trả phòng / xác nhận trả, thu tiền (Quản lý sửa/xoá khoản thu), huỷ đơn (hoàn cọc), sửa đơn, gia hạn (mở dialog — file 09), xem mã cửa, sao chép tin nhắn gửi khách theo mẫu.',
  access: [
    'Màn Đơn thuê: bấm một dòng (file 06).',
    'Màn Lịch đặt phòng: bấm một khối đơn (file 05).',
    'Link / nút xử lý nhanh ở Tổng quan, bảng thông báo (mở kèm action), nhật ký thao tác; sau khi lưu đơn ở màn Tạo/Sửa đơn.',
  ],
  roles: `${ROLES.all}. Nhân viên: không sửa/xoá khoản đã thu, không huỷ đơn đã thu tiền ngoài cọc, không sửa số tiền hoàn, chỉ xem mã cửa khi đang trong ca hoặc đơn giao với ca của mình.`,
  related: ['06_DonThue', '05_LichDatPhong', '08_TaoSuaDon (Sửa đơn)', '09_GiaHan', '17_CaiDat (mẫu tin nhắn, thông tin homestay)', '00_TongThe (trạng thái đơn, nhật ký)'],
  sources: [
    'frontend/src/app/pages/orders/order-detail.{ts,html,scss}',
    'frontend/src/app/core/order.service.ts, message-template.ts (ghép tin nhắn), settings.service.ts, room.service.ts',
    'backend/.../order/OrderController.java, OrderService (get, getDoorCode), OrderLifecycleService (checkIn, checkout, cancel), OrderPaymentService',
  ],
  history: FIRST_VERSION,
  shots: [
    { id: 'booked', caption: 'Đơn Đã đặt (khách tự check-in, Quản lý xem)', clip: DETAIL, go: openOrder('upcoming') },
    { id: 'staying', caption: 'Đơn Đang ở có khoản thu thêm', clip: DETAIL, go: openOrder('staying') },
    {
      id: 'payment',
      caption: 'Form Thu tiền',
      clip: DETAIL,
      go: async (page, ctx) => {
        await openOrder('staying')(page, ctx);
        await page.click(`${DETAIL} .add-pay`);
      },
    },
    {
      id: 'checkout',
      caption: 'Form Trả phòng (đơn Quá giờ)',
      note: 'Mở bằng nút Trả phòng hoặc link ?action=checkout (nút xử lý nhanh).',
      clip: DETAIL,
      go: async (page, ctx) => {
        await openOrder('overstay', 'checkout')(page, ctx);
        await page.locator(`${CHECKOUT} .kv.due`).waitFor();
      },
    },
    {
      id: 'cancel',
      caption: 'Form Huỷ đơn',
      clip: DETAIL,
      go: async (page, ctx) => {
        await openOrder('family')(page, ctx);
        await page.click(`${DETAIL} .dp-a .danger`);
        await page.locator(`${CANCEL} .hint`).waitFor();
      },
    },
    { id: 'cancelled', caption: 'Đơn Đã huỷ', clip: DETAIL, go: openOrder('cancelled') },
    {
      id: 'staffDenied',
      caption: 'Nhân viên bấm Hiện mã cửa ngoài ca trực',
      role: 'staff',
      clip: DETAIL,
      go: async (page, ctx) => {
        await openOrder('upcoming')(page, ctx);
        await page.click(`${DETAIL} .code button`);
        await page.locator(`${DETAIL} .dp-a .pay-err`).waitFor();
      },
    },
    {
      id: 'copied',
      caption: 'Sao chép tin nhắn (mẫu có mã cửa)',
      note: 'Sao chép mẫu có {ma_cua} luôn lấy mã cửa qua API → ghi nhật ký "Sao chép tin nhắn có mã cửa", đơn được tính là đã gửi mã.',
      clip: DETAIL,
      go: async (page, ctx) => {
        await openOrder('upcoming')(page, ctx);
        await page.click(`${DETAIL} .msg button`);
        await page.locator(`${DETAIL} .dp-a .hint`).waitFor();
      },
    },
  ],
  items: [
    { sel: `${DETAIL} .dp-h`, label: 'Mã đơn + trạng thái', kind: 'Tiêu đề + tag', code: 'order().code · STATUS_TAG[status]', rule: 'Mã đơn "SH-" + (1000 + id).' },
    {
      sel: `${DETAIL} .sec >> nth=0`, label: 'Khách thuê', kind: 'Nhóm thông tin', code: 'guestName, guestPhone, guestIdNumberMasked, guestCount, source, note',
      note: 'Họ tên; SĐT (link tel: để gọi); CCCD che "•••••••• 1234" (chỉ khi có); "{n} người · {nguồn}"; Ghi chú (chỉ khi có).',
    },
    {
      sel: `${DETAIL} .sec >> nth=1 >> h3`, label: 'Phòng · loại thuê · hình thức', kind: 'Tiêu đề nhóm', code: 'roomNumber · roomName — rentalType · checkInMode',
      note: '"{số} · {tên phòng} — {Theo giờ/Qua đêm/Theo ngày} · {khách tự check-in / nhân viên đón}". Phòng là phòng hiện tại (chặng cuối).',
    },
    { sel: `${DETAIL} .sec >> nth=1 >> .kv >> nth=0`, label: 'Nhận phòng', kind: 'Chữ', code: 'checkInAt', dataType: 'ngày giờ', rule: '"HH:mm, dd/MM/yyyy" — giờ hẹn.' },
    {
      sel: `${DETAIL} .sec >> nth=1 >> .kv >> nth=1`, label: 'Trả phòng', kind: 'Chữ', code: 'checkOutAt', dataType: 'ngày giờ',
      rule: '"HH:mm, dd/MM/yyyy" — giờ hẹn (sau gia hạn là giờ mới).',
      note: 'Đơn có > 1 chặng (gia hạn chuyển phòng) hiện thêm dòng "Các chặng": "Phòng {số}: HH:mm, dd/MM → HH:mm, dd/MM" từng chặng.',
    },
    {
      sel: `${DETAIL} .code`, label: 'Mã cửa của đơn + nút Hiện', kind: 'Chữ che + nút phụ', code: 'hasDoorCode · doorCode · revealDoorCode()',
      note: 'Chỉ hiện khi đơn có mã cửa. Mặc định "•• •• ••"; bấm Hiện → GET /orders/{id}/door-code (ghi nhật ký Xem mã cửa) rồi hiện mã. Nhân viên ngoài ca: báo lỗi (ảnh 7).',
    },
    {
      sel: `${MONEY} .kv >> nth=0`, label: 'Tiền phòng (hạng phòng lúc đặt)', kind: 'Dòng tiền', code: 'roomPriceAmount · roomTypeNameSnapshot', dataType: 'tiền',
      note: 'Bên dưới là từng phụ thu đã áp (tên + số tiền, lưu snapshot — kể cả "Quá giờ …", "Gia hạn +…", phụ thu thêm tay) và "Giảm giá (lý do) −…" nếu có.',
    },
    { sel: `${MONEY} .kv.tot`, label: 'Tổng', kind: 'Dòng tiền (đậm)', code: 'totalAmount', dataType: 'tiền' },
    { sel: `${MONEY} .kv:has-text("Đã cọc")`, label: 'Đã cọc (hình thức)', kind: 'Dòng tiền', code: 'deposit · depositMethod', dataType: 'tiền', note: 'Hiện "−{tiền}".' },
    { sel: `${MONEY} .kv:has(span:text-is("Đã thu"))`, label: 'Đã thu', kind: 'Dòng tiền', code: 'paidAmount', dataType: 'tiền', rule: 'Cọc + tổng các khoản thu thêm.' },
    {
      sel: `${MONEY} .kv.due`, label: 'Còn phải thu', kind: 'Dòng tiền (nổi bật)', code: 'dueAmount', dataType: 'tiền',
      rule: 'max(0, Tổng − Đã thu).', note: 'Không hiện với đơn Đã huỷ.',
    },
    {
      sel: `${DETAIL} .add-pay`, label: 'Thu tiền', kind: 'Nút phụ', code: 'openPaymentForm()',
      note: 'Hiện khi đơn chưa Đã trả / Đã huỷ và còn phải thu > 0. Mở form thu (ảnh 3).',
    },
    {
      sel: `${DETAIL} .dp-a .btn-p`, label: 'Nhận phòng', kind: 'Nút chính', code: 'checkIn()',
      note: 'Chỉ đơn Đã đặt. Hỏi lại "Xác nhận khách đã nhận phòng {số}?"; phòng đang Chờ dọn thì hỏi "Phòng {số} đang Chờ dọn. Đánh dấu Đã dọn rồi nhận phòng?" (đồng ý → đánh dấu Đã dọn trước).',
    },
    { sel: `${DETAIL} .dp-a a:has-text("Sửa đơn")`, label: 'Sửa đơn', kind: 'Nút phụ (link)', code: "routerLink=['/don-thue', id, 'sua']", note: 'Chỉ đơn Đã đặt. Mở màn Sửa đơn (file 08).' },
    {
      sel: `${DETAIL} .dp-a .danger`, label: 'Huỷ đơn', kind: 'Nút phụ (đỏ)', code: 'canCancel · openCancel()',
      note: 'Hiện khi: Đã đặt, Đang ở, hoặc Chờ xác nhận trả của đơn khách tự check-in; Nhân viên chỉ thấy khi đơn chưa có khoản thu ngoài cọc. Mở form huỷ (ảnh 5).',
    },
    {
      sel: `${DETAIL} .msg .sel`, label: 'Chọn mẫu tin nhắn', kind: 'Ô chọn', code: 'selectedTemplateId', dataType: 'id mẫu', required: 'Không',
      default: 'Mẫu mặc định của hình thức check-in của đơn; không có thì mẫu đầu tiên', note: 'Danh sách mẫu ở Cài đặt (file 17).',
    },
    {
      sel: `${DETAIL} .msg button`, label: 'Sao chép', kind: 'Nút phụ', code: 'copyMessage()',
      note: 'Ghép nội dung mẫu với dữ liệu đơn + thông tin homestay + hướng dẫn phòng hiện hành rồi ghi vào clipboard (ảnh 8).',
    },
    { sel: `${DETAIL} .dp-a a:has-text("Gọi khách")`, label: 'Gọi khách', kind: 'Nút phụ (link)', code: "href='tel:' + guestPhone", note: 'Mở ứng dụng gọi điện của thiết bị.' },

    { shot: 'staying', sel: `${DETAIL} .kv:has-text("Nhận thực tế")`, label: 'Nhận thực tế', kind: 'Chữ', code: 'actualCheckInAt', rule: '"HH:mm, dd/MM". Có thêm "Trả thực tế" khi đã trả phòng.' },
    {
      shot: 'staying', sel: `${DETAIL} .kv.pay >> nth=0`, label: 'Khoản thu thêm', kind: 'Dòng tiền', code: 'payments[i]',
      note: '"Thu HH:mm, dd/MM · {hình thức} · {người thu}" + ghi chú (nếu có), số tiền "−…".',
    },
    {
      shot: 'staying', sel: `${DETAIL} .kv.pay .ib >> nth=0`, label: 'Sửa khoản thu', kind: 'Nút icon', code: 'openPaymentForm(p)', badge: 'right',
      note: 'Chỉ Quản lý, đơn chưa Đã trả / Đã huỷ. Mở form thu với số liệu khoản đó, nút "Lưu".',
    },
    {
      shot: 'staying', sel: `${DETAIL} .kv.pay .ib >> nth=1`, label: 'Xoá khoản thu', kind: 'Nút icon', code: 'deletePayment(p)', badge: 'right',
      note: 'Chỉ Quản lý. Hỏi lại "Xoá khoản thu {tiền}?".',
    },
    {
      shot: 'staying', sel: `${DETAIL} .dp-a .btn-p`, label: 'Trả phòng / Xác nhận trả phòng', kind: 'Nút chính', code: 'openCheckout()',
      note: 'Đơn Đang ở, Quá giờ: "Trả phòng"; Chờ xác nhận trả: "Xác nhận trả phòng". Mở form trả phòng (ảnh 4).',
    },
    { shot: 'staying', sel: `${DETAIL} .dp-a button:has-text("Gia hạn")`, label: 'Gia hạn', kind: 'Nút phụ', code: 'extendOpen.set(true)', note: 'Đơn Đang ở, Quá giờ, Chờ xác nhận trả. Mở dialog Gia hạn (file 09).' },

    {
      shot: 'payment', sel: `${DETAIL} .pay-form .pf-row label >> nth=0`, label: 'Số tiền', kind: 'Ô nhập số', code: 'paymentAmount', dataType: 'số nguyên (VND)',
      required: 'Có', rule: '> 0 (frontend báo "Số tiền phải lớn hơn 0."); tổng đã thu sau khi thu không vượt tổng tiền (backend).', default: 'Số còn phải thu (sửa: số của khoản đó)',
    },
    { shot: 'payment', sel: `${DETAIL} .pay-form .pf-row label >> nth=1`, label: 'Hình thức', kind: 'Ô chọn', code: 'paymentMethod', dataType: 'CASH | TRANSFER', required: 'Có', default: 'Tiền mặt' },
    { shot: 'payment', sel: `${DETAIL} .pay-form > label`, label: 'Ghi chú', kind: 'Ô nhập chữ', code: 'paymentNote', dataType: 'string', required: 'Không', rule: 'Tối đa 255 ký tự; để trống lưu NULL.', default: '(trống)' },
    { shot: 'payment', sel: `${DETAIL} .pay-form .pf-a .btn-p`, label: 'Thu tiền / Lưu', kind: 'Nút chính', code: 'savePayment()', note: 'Thêm mới: "Thu tiền" → POST /orders/{id}/payments; sửa: "Lưu" → PUT /orders/{id}/payments/{paymentId}.' },
    { shot: 'payment', sel: `${DETAIL} .pay-form .pf-a .btn-s`, label: 'Huỷ', kind: 'Nút phụ', code: 'closePaymentForm()', note: 'Đóng form, không lưu.' },

    { shot: 'checkout', sel: `${CHECKOUT} h3`, label: 'Tiêu đề form trả phòng', kind: 'Tiêu đề', code: 'checkoutOpen', note: '"Trả phòng" hoặc "Xác nhận trả phòng" (đơn Chờ xác nhận trả).' },
    {
      shot: 'checkout', sel: `${CHECKOUT} .pf-row label >> nth=0`, label: 'Giờ nhận thực tế', kind: 'Ô ngày giờ (datetime-local)', code: 'checkoutIn', dataType: 'ngày giờ',
      required: 'Có', default: 'Giờ nhận thực tế đã ghi, chưa có thì giờ hẹn nhận',
    },
    {
      shot: 'checkout', sel: `${CHECKOUT} .pf-row label >> nth=1`, label: 'Giờ trả thực tế', kind: 'Ô ngày giờ (datetime-local)', code: 'checkoutOut', dataType: 'ngày giờ',
      required: 'Có', rule: 'Phải sau giờ nhận thực tế.', default: 'Đơn Chờ xác nhận trả: giờ hẹn trả; còn lại: bây giờ',
      note: 'Đổi giờ → tính lại (POST /orders/{id}/checkout/preview).',
    },
    {
      shot: 'checkout', sel: `${CHECKOUT} .manual`, label: 'Thêm phụ thu (thêm tay)', kind: 'Ô chọn (checkbox) nhiều', code: 'checkoutManualIds · toggleManualSurcharge()',
      dataType: 'danh sách id phụ thu', required: 'Không', default: 'Không chọn', note: 'Các phụ thu loại "Thêm tay vào đơn" đang dùng, áp cho hạng phòng của đơn: "{tên} +{tiền}".',
    },
    {
      shot: 'checkout', sel: `${CHECKOUT} .kv >> nth=0`, label: 'Phụ thu phát sinh', kind: 'Dòng tiền', code: 'checkoutPreview.newSurcharges',
      note: 'Quá giờ (theo giờ trả thực tế, xem sheet 4) và phụ thu thêm tay đã chọn, "+{tiền}".',
    },
    { shot: 'checkout', sel: `${CHECKOUT} .kv.due`, label: 'Tổng / Đã thu / Còn phải thu', kind: 'Dòng tiền', code: 'checkoutPreview.totalAmount, paidAmount, dueAmount', dataType: 'tiền' },
    {
      shot: 'checkout', sel: `${CHECKOUT} label:has(select)`, label: 'Thu số còn lại bằng', kind: 'Ô chọn', code: 'checkoutMethod', dataType: 'CASH | TRANSFER',
      required: 'Có (khi còn phải thu > 0)', default: 'Tiền mặt', note: 'Chỉ hiện khi còn phải thu > 0.',
    },
    {
      shot: 'checkout', sel: `${CHECKOUT} .pf-a .btn-p`, label: 'Thu … & trả phòng / Xác nhận đã trả phòng', kind: 'Nút chính', code: 'confirmCheckout()',
      note: 'Còn phải thu > 0: "Thu {tiền} & trả phòng"; không: "Xác nhận đã trả phòng". Khoá khi chưa có kết quả tính. Nút "Huỷ" bên cạnh đóng form.',
    },

    { shot: 'cancel', sel: `${CANCEL} .hint`, label: 'Mức hoàn cọc tự tính', kind: 'Chữ', code: 'cancelPreview.refundPercent, defaultRefundAmount', note: '"Huỷ lúc này hoàn {%}% cọc ({tiền}). Trước giờ nhận ≥ 24 giờ hoàn 100%, trong 24 giờ hoàn 50%, từ giờ nhận trở đi không hoàn."' },
    {
      shot: 'cancel', sel: `${CANCEL} input[type=number]`, label: 'Số tiền hoàn cho khách', kind: 'Ô nhập số', code: 'cancelRefund', dataType: 'số nguyên (VND)',
      required: 'Có', rule: '0 ≤ số hoàn ≤ đã thu. Nhân viên: chỉ đọc (readonly).', default: 'Mức hoàn tự tính',
    },
    {
      shot: 'cancel', sel: `${CANCEL} label:has-text("Lý do huỷ")`, label: 'Lý do huỷ', kind: 'Ô nhập chữ', code: 'cancelReason', dataType: 'string',
      required: 'Khi số hoàn khác mức tự tính', rule: 'Tối đa 255 ký tự. Nhãn thêm "(bắt buộc khi sửa số tiền hoàn)" khi số hoàn khác mặc định.', default: '(trống)',
    },
    { shot: 'cancel', sel: `${CANCEL} .danger-p`, label: 'Xác nhận huỷ đơn', kind: 'Nút chính (đỏ)', code: 'confirmCancel()', note: 'Hỏi lại "Huỷ đơn {mã}? Thao tác này không hoàn tác được.".' },
    { shot: 'cancel', sel: `${CANCEL} .pf-a .btn-s`, label: 'Đóng', kind: 'Nút phụ', code: 'closeCancel()' },

    {
      shot: 'cancelled', sel: `${DETAIL} .sec:has(h3:text-is("Đã huỷ"))`, label: 'Thông tin huỷ', kind: 'Nhóm thông tin', code: 'cancelledAt, refundAmount, cancelReason',
      note: '"Lúc HH:mm, dd/MM" · "Hoàn cho khách {tiền}" · "Lý do" (nếu có). Đơn huỷ không còn nút thao tác (chỉ còn sao chép tin nhắn, gọi khách).',
    },
    {
      shot: 'staffDenied', sel: `${DETAIL} .dp-a .pay-err`, label: 'Lỗi thao tác', kind: 'Chữ báo lỗi (đỏ)', code: 'actionError',
      note: 'Lỗi từ server của các thao tác (ở đây: "Chỉ xem được mã cửa khi đang trong ca hoặc đơn thuộc ca trực của bạn").',
    },
    {
      shot: 'copied', sel: `${DETAIL} .dp-a .hint`, label: 'Kết quả sao chép', kind: 'Chữ', code: 'copyFeedback',
      note: '"Đã sao chép tin nhắn." · "Không sao chép được, hãy thử lại." · "Không sao chép được: {lý do}." (không lấy được mã cửa). Mã cửa vừa lấy hiện luôn ở mục 6.',
    },
  ],
  logic: [
    { title: 'LOGIC CHI TIẾT ĐƠN' },
    { h: '1. Khởi tạo (mỗi lần đổi orderId / autoAction)' },
    {
      list: [
        'Đóng mọi form đang mở, xoá mã cửa đã hiện, thông báo cũ.',
        'Song song: GET /api/orders/{id}; GET /api/message-templates + GET /api/settings/homestay (chỉ tải 1 lần, dùng lại cho các đơn mở sau).',
        'Chọn sẵn mẫu tin nhắn: mẫu có defaultForCheckInMode = hình thức check-in của đơn; không có thì mẫu đầu tiên.',
        'GET /api/rooms/{roomId} lấy hướng dẫn nhận phòng hiện hành của phòng (biến {huong_dan}).',
        'Sau đó làm autoAction (nếu có): copy → sao chép tin nhắn; checkout → mở form trả phòng; extend → mở dialog Gia hạn (2 hành động sau chỉ khi đơn Đang ở / Quá giờ / Chờ xác nhận trả).',
        'Đơn không tồn tại: hiện lý do (vd "Đơn không tồn tại") thay vì khung trống.',
      ],
    },
    { h: '2. Thao tác, API, quyền, nhật ký' },
    {
      table: {
        cols: [{ h: 'Thao tác', w: 4 }, { h: 'Điều kiện hiện / quyền', w: 8 }, { h: 'API', w: 7 }, { h: 'Kết quả + nhật ký', w: 13 }],
        rows: [
          ['Nhận phòng', 'Đơn Đã đặt; mọi vai trò', 'GET /rooms/{id} (xem Chờ dọn) → [POST /rooms/{id}/cleaned] → POST /orders/{id}/check-in', 'Đang ở, giờ nhận thực tế = bây giờ. Nhật ký CHECK_IN "Nhận phòng" (+ ROOM_CLEANED nếu dọn trước).'],
          ['Trả phòng / Xác nhận trả', 'Đang ở, Quá giờ, Chờ xác nhận trả; mọi vai trò', 'POST /orders/{id}/checkout/preview (mỗi lần đổi) → POST /orders/{id}/checkout', 'Lưu giờ thực tế; thêm dòng phụ thu mới; tổng mới; còn phải thu > 0 thì tự thêm khoản thu "Thu khi trả phòng"; Đã trả; phòng Chờ dọn. Nhật ký CHECK_OUT "Trả phòng, thu {tiền} {hình thức}".'],
          ['Thu tiền', 'Đơn chưa Đã trả/Đã huỷ, còn phải thu > 0; mọi vai trò', 'POST /orders/{id}/payments', 'Thêm khoản thu (người thu = tài khoản đăng nhập). Nhật ký PAYMENT_ADDED "Thu {tiền} {hình thức}".'],
          ['Sửa khoản thu', 'Chỉ Quản lý (@PreAuthorize); đơn chưa Đã trả/Đã huỷ', 'PUT /orders/{id}/payments/{paymentId}', 'Nhật ký PAYMENT_UPDATED "Sửa khoản thu A thành B".'],
          ['Xoá khoản thu', 'Chỉ Quản lý; hỏi lại', 'DELETE /orders/{id}/payments/{paymentId}', 'Nhật ký PAYMENT_DELETED "Xoá khoản thu …".'],
          ['Huỷ đơn', 'Đã đặt / Đang ở / Chờ xác nhận trả (khách tự check-in); NV chỉ khi chưa có khoản thu ngoài cọc, không sửa số hoàn', 'GET /orders/{id}/cancel/preview → POST /orders/{id}/cancel', 'Đã huỷ, ghi lúc huỷ, số hoàn, lý do; khung giờ trống lại. Nhật ký ORDER_CANCELLED "Huỷ đơn, hoàn {tiền} — {lý do}". Không hoàn tác.'],
          ['Hiện mã cửa', 'Đơn có mã cửa; Quản lý luôn được, NV khi đang trong ca hoặc thời gian ở của đơn giao với một ca của mình', 'GET /orders/{id}/door-code', 'Nhật ký DOOR_CODE_VIEWED "Xem mã cửa".'],
          ['Sao chép tin nhắn', 'Mọi đơn; mẫu có {ma_cua} + đơn có mã cửa thì như Hiện mã cửa', 'GET /orders/{id}/door-code?forMessage=true (chỉ khi mẫu có {ma_cua})', 'Ghi clipboard. Nhật ký DOOR_CODE_COPIED "Sao chép tin nhắn có mã cửa" → đơn tính là đã gửi mã (Tổng quan, thông báo).'],
          ['Sửa đơn', 'Đơn Đã đặt', '— (chuyển màn)', 'Mở /don-thue/{id}/sua (file 08).'],
          ['Gia hạn', 'Đang ở, Quá giờ, Chờ xác nhận trả', '— (mở dialog)', 'Dialog Gia hạn (file 09); xong cập nhật đơn đang xem.'],
        ],
      },
    },
    {
      note: 'Sau nhận/trả phòng, huỷ, gia hạn: phát sự kiện changed → màn cha (Đơn thuê, Lịch) tải lại. Thao tác đang chạy thì các nút chính bị khoá (acting).',
    },
    { h: '3. Tính tiền khi trả phòng (OrderLifecycleService.computeCheckout)' },
    {
      list: [
        'Lấy phụ thu đang dùng áp cho hạng phòng của đơn; tính bằng SurchargeCalculator với: giá mỗi giờ thêm = snapshot của đơn, giờ hẹn trả = checkOutAt, giờ trả thực tế = giờ nhập, phụ thu thêm tay đã chọn (phụ thu theo ngày và vượt khách đã cộng lúc tạo đơn, không tính lại).',
        'Quá giờ: trễ ≤ phút ân hạn (mặc định 15) → 0; quá ân hạn → tính từ giờ hẹn trả (không trừ ân hạn), làm tròn lên theo giờ × giá mỗi giờ thêm. Ví dụ trễ 30 phút → 1 giờ, 1 giờ 10 phút → 2 giờ.',
        'Tổng mới = tổng cũ + phụ thu mới (trả sớm không giảm tiền). Còn phải thu = max(0, tổng mới − đã thu).',
      ],
    },
    { h: '4. Ghép tin nhắn (core/message-template.ts)' },
    {
      table: {
        cols: [{ h: 'Biến', w: 5 }, { h: 'Giá trị', w: 27 }],
        rows: [
          ['{ten_khach} {ma_don}', 'Tên khách; mã đơn SH-xxxx'],
          ['{phong} {loai_thue}', '"{số} · {tên phòng}"; theo giờ / qua đêm / theo ngày'],
          ['{gio_nhan} {gio_tra}', '"HH:mm, dd/MM/yyyy" giờ hẹn'],
          ['{so_khach} {tong_tien} {da_coc} {con_phai_thu}', 'Số khách; tổng tiền; tiền cọc; còn phải thu (định dạng 1.250.000đ)'],
          ['{ma_cua}', 'Mã cửa đã giải mã (lấy qua API khi sao chép); không có thì rỗng'],
          ['{huong_dan}', 'Hướng dẫn nhận phòng hiện hành của phòng (không lưu theo đơn)'],
          ['{ten_homestay} {dia_chi} {ban_do} {hotline} {wifi} {mat_khau_wifi}', 'Thông tin homestay ở Cài đặt'],
        ],
      },
    },
    { note: 'Biến không có trong danh sách giữ nguyên chữ {…}. App chỉ tạo nội dung để dán vào Zalo/SMS, không tự gửi.' },
    { h: '5. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 12 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Nhận phòng đơn không ở Đã đặt', 400, 'Chỉ nhận phòng được đơn ở trạng thái Đã đặt'],
          ['Trả phòng đơn không đang ở', 400, 'Chỉ trả phòng được đơn đang ở'],
          ['Giờ trả thực tế ≤ giờ nhận thực tế', 400, 'Giờ trả thực tế phải sau giờ nhận thực tế'],
          ['Còn phải thu mà không chọn hình thức', 400, 'Chọn hình thức thu số tiền còn lại'],
          ['Thu vượt tổng tiền', 400, 'Tổng đã thu vượt tổng tiền của đơn'],
          ['Thu/sửa tiền đơn đã trả hoặc đã huỷ', 400, 'Đơn đã trả phòng hoặc đã huỷ, không sửa tiền được'],
          ['Số tiền thu ≤ 0 (frontend)', '—', 'Số tiền phải lớn hơn 0.'],
          ['NV sửa/xoá khoản thu', 403, 'Không có quyền thực hiện'],
          ['Huỷ đơn ở trạng thái không cho phép', 400, 'Đơn ở trạng thái này không huỷ được'],
          ['NV huỷ đơn đã thu ngoài cọc', 403, 'Đơn đã thu tiền ngoài cọc, chỉ Quản lý được huỷ'],
          ['NV sửa số tiền hoàn', 403, 'Chỉ Quản lý được sửa số tiền hoàn'],
          ['Sửa số hoàn mà không nhập lý do', '400 / frontend', 'Phải nhập lý do khi sửa số tiền hoàn'],
          ['Số hoàn > đã thu', 400, 'Số tiền hoàn không được vượt số đã thu'],
          ['NV xem mã cửa ngoài ca', 403, 'Chỉ xem được mã cửa khi đang trong ca hoặc đơn thuộc ca trực của bạn'],
          ['Đơn không tồn tại', 404, 'Đơn không tồn tại'],
        ],
      },
    },
    { h: '6. Sơ đồ luồng nhận – trả phòng' },
    { diagram: 'checkInOut' },
  ],
  diagrams: {
    checkInOut: `flowchart TD
  A([Đơn Đã đặt]) --> B{Hình thức check-in}
  B -- Nhân viên đón --> C[Bấm Nhận phòng]
  C --> D{Phòng Chờ dọn?}
  D -- Có --> E[Hỏi: đánh dấu Đã dọn rồi nhận?<br/>POST /rooms/id/cleaned]
  D -- Không --> F[Hỏi xác nhận]
  E --> G[POST /orders/id/check-in]
  F --> G
  B -- Khách tự check-in --> H[Tác vụ nền: tới giờ nhận<br/>tự chuyển Đang ở]
  G --> I([Đang ở])
  H --> I
  I --> J{Tới giờ trả?}
  J -- "NV đón: tác vụ nền" --> K([Quá giờ])
  J -- "Khách tự: tác vụ nền" --> L([Chờ xác nhận trả])
  I -- Bấm Trả phòng --> M
  K -- Bấm Trả phòng --> M
  L -- Bấm Xác nhận trả phòng --> M
  M[Form trả phòng: giờ thực tế,<br/>phụ thu thêm tay → preview] --> N{Còn phải thu > 0?}
  N -- Có --> O[Chọn hình thức thu<br/>Thu … & trả phòng]
  N -- Không --> P[Xác nhận đã trả phòng]
  O --> Q[POST /orders/id/checkout]
  P --> Q
  Q --> R([Đã trả · phòng Chờ dọn])
  R --> S[Bấm Đã dọn ở màn Phòng → Trống]`,
  },
};
