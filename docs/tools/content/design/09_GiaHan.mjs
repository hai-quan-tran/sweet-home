// Nội dung file 09_GiaHan.xlsx: dialog Gia hạn / Chuyển phòng.
import { ROLES, fixVersion } from '../common.mjs';

const DIALOG = '.p-dialog';
const VIEWPORT = { width: 1440, height: 1200 };

/**
 * Mở dialog Gia hạn của đơn (qua link ?action=extend), bấm "+" thêm số giờ nếu cần.
 * @param {string} key khoá đơn trong ctx.order
 * @param {number} plus số lần bấm "Thêm 1 giờ"
 */
const openExtend = (key, plus = 0) => async (page, ctx) => {
  await ctx.open(page, `/don-thue?id=${ctx.order[key]}&action=extend`);
  await page.locator(`${DIALOG} .fee`).waitFor();
  for (let i = 0; i < plus; i++) {
    await page.click(`${DIALOG} button[aria-label="Thêm 1 giờ"]`);
    await page.waitForLoadState('networkidle');
  }
};

export default {
  file: '09_GiaHan',
  title: 'Gia hạn / Chuyển phòng',
  kind: 'Dialog',
  route: 'Mở trên /don-thue hoặc /lich (link trực tiếp: /don-thue?id={id}&action=extend)',
  summary: 'Gia hạn đơn đang ở thêm giờ hoặc ngày. Giờ trả mới phải cách giờ nhận của đơn kế tiếp ở phòng đó ít nhất 1 tiếng; không giữ được phòng thì chọn phòng cùng giá, đã dọn, trống để chuyển khách (đơn có thêm chặng). Không có phòng nào thì khoá nút và gợi ý số giờ tối đa còn thêm được. Phí gia hạn thu ngay hoặc cộng lúc trả phòng.',
  access: [
    'Chi tiết đơn Đang ở / Quá giờ / Chờ xác nhận trả → nút "Gia hạn" (file 07).',
    'Bảng thông báo: thông báo phòng quá giờ → "Gia hạn" (file 03).',
  ],
  roles: ROLES.all,
  related: ['07_ChiTietDon', '05_LichDatPhong (chặng hiện ở dòng phòng mới)', '00_TongThe (bảng order_stay)'],
  sources: [
    'frontend/src/app/pages/orders/extend-dialog.{ts,html,scss}',
    'frontend/src/app/core/order.service.ts (previewExtend, extend)',
    'backend/.../order/OrderController.java (POST /orders/{id}/extend/preview, /extend), OrderExtensionService, ExtendRequest, ExtendPreviewResponse',
  ],
  history: fixVersion('Phòng còn khách Quá giờ / Chờ xác nhận trả không còn nằm trong danh sách phòng chuyển được.'),
  shots: [
    {
      id: 'available', caption: 'Gia hạn tại phòng (giữ được phòng)', viewport: VIEWPORT, fullPage: false, clip: DIALOG,
      go: openExtend('staying'),
    },
    {
      id: 'move', caption: 'Trùng đơn sau: chọn phòng cùng giá để chuyển khách', viewport: VIEWPORT, fullPage: false, clip: DIALOG,
      go: openExtend('staying', 1),
    },
    {
      id: 'noroom', caption: 'Không có phòng phù hợp: khoá nút, gợi ý thêm giờ', viewport: VIEWPORT, fullPage: false, clip: DIALOG,
      go: openExtend('staying301', 1),
    },
  ],
  items: [
    { sel: `${DIALOG} .p-dialog-header`, label: 'Tiêu đề + nút đóng', kind: 'Tiêu đề dialog', code: "'Gia hạn · ' + code + ' · ' + guestName", note: 'Nút X, phím Esc, nút Huỷ: đóng không lưu. Dialog modal (phủ màn).' },
    { sel: `${DIALOG} .sub`, label: 'Phòng · loại thuê · hình thức', kind: 'Chữ', code: 'order()', note: '"Phòng {số} · {tên} · {loại thuê} · {khách tự check-in / nhân viên check-in}".' },
    { sel: `${DIALOG} .fact >> nth=0`, label: 'Giờ trả hiện tại', kind: 'Chữ', code: 'preview.currentCheckOutAt', rule: '"HH:mm · dd/MM".' },
    { sel: `${DIALOG} .fact >> nth=1`, label: 'Nên báo gia hạn trước', kind: 'Chữ', code: 'noticeBy (computed)', rule: 'Giờ trả hiện tại − 1 tiếng; kèm "muộn hơn vẫn được nếu không trùng đơn sau".' },
    { sel: `${DIALOG} .fact >> nth=2`, label: 'Đơn kế tiếp của phòng', kind: 'Chữ', code: 'preview.nextOrder', note: 'Giờ nhận + "{mã} · {khách}" của chặng sớm nhất của đơn khác ở phòng này bắt đầu từ giờ trả hiện tại; không có: "Chưa có".' },
    {
      sel: `${DIALOG} .seg`, label: 'Kiểu gia hạn', kind: 'Nhóm nút chọn (radio)', code: 'type · setType()', dataType: 'HOUR | DAY', required: 'Có',
      default: 'Thêm giờ', note: '"Thêm giờ · {giá mỗi giờ thêm}/giờ" · "Thêm ngày · {giá ngày}/ngày" — giá lấy snapshot của đơn. Đổi kiểu về số lượng 1.',
    },
    { sel: `${DIALOG} .stepper`, label: 'Gia hạn thêm', kind: 'Số + nút −/+', code: 'quantity · step()', dataType: 'số nguyên', required: 'Có', rule: '≥ 1 (nút − khoá ở 1).', default: '1' },
    { sel: `${DIALOG} .newout`, label: 'Giờ trả mới', kind: 'Chữ (đậm)', code: 'preview.newCheckOutAt', rule: 'Giờ trả hiện tại + N giờ / N ngày.' },
    {
      sel: `${DIALOG} .limit`, label: 'Giới hạn giữ phòng', kind: 'Thông báo (xanh)', code: 'preview.maxCheckOutAt',
      note: 'Có đơn kế tiếp và vẫn giữ được phòng: "Ở phòng {số} chỉ gia hạn được đến {giờ}, vì đơn {mã} nhận phòng {giờ} và cần cách 1 tiếng."',
    },
    { sel: `${DIALOG} .fee`, label: 'Phí gia hạn', kind: 'Dòng tiền', code: 'preview.fee', dataType: 'tiền', rule: 'N × giá mỗi giờ thêm (thêm giờ) hoặc N × giá ngày (thêm ngày).' },
    {
      sel: `${DIALOG} .radios`, label: 'Thu tiền', kind: 'Nhóm nút chọn (radio) + ô chọn', code: 'collectNow · paymentMethod', dataType: 'boolean; CASH | TRANSFER',
      required: 'Có', default: 'Cộng vào lúc trả phòng', note: 'Chọn "Thu ngay" hiện thêm ô hình thức thu (mặc định Tiền mặt).',
    },
    { sel: `${DIALOG} .rules`, label: 'Quy tắc gia hạn', kind: 'Danh sách (tĩnh)', code: '.rules', note: '4 quy tắc nhắc người dùng (xem sheet 4).' },
    {
      sel: `${DIALOG} .p-dialog-footer`, label: 'Huỷ · Xác nhận gia hạn', kind: 'Nút phụ + nút chính', code: 'confirm() · confirmLabel', badge: 'right',
      note: 'Nút chính: "Xác nhận gia hạn đến {giờ · ngày}" (giữ được phòng) / "Chuyển sang {số phòng} & gia hạn đến …" (chọn phòng chuyển) / khoá khi không gia hạn được.',
    },
    {
      shot: 'move', sel: `${DIALOG} .limit.c`, label: 'Cảnh báo không giữ được phòng', kind: 'Thông báo (đỏ)', code: '!preview.available',
      note: '"Phòng {số} không giữ được đến {giờ mới} vì trùng đơn {mã} nhận phòng {giờ}. Chọn phòng cùng giá bên dưới để chuyển khách."',
    },
    {
      shot: 'move', sel: `${DIALOG} .ropt >> nth=0`, label: 'Phòng chuyển sang được', kind: 'Lựa chọn (radio)', code: 'preview.moveOptions · targetRoomId', dataType: 'id phòng',
      required: 'Có (khi không giữ được phòng)', default: 'Phòng đầu tiên (số phòng nhỏ nhất)',
      note: '"{số} · {tên}" + "{n} khách · đã dọn · trống từ {giờ trả hiện tại} đến {giờ nhận đơn sau của phòng đó} / trở đi" + giá/đơn vị.',
    },
    {
      shot: 'move', sel: `${DIALOG} .hint:has-text("thêm chặng")`, label: 'Mô tả chặng mới', kind: 'Chữ', code: 'targetRoom()',
      note: '"Đơn {mã} sẽ có thêm chặng: ở phòng {cũ} đến {giờ trả hiện tại}, sau đó phòng {mới} từ … đến {giờ trả mới}. Nhân viên trong ca hỗ trợ khách chuyển phòng."',
    },
    { shot: 'move', sel: `${DIALOG} .p-dialog-footer button >> nth=1`, label: 'Chuyển sang … & gia hạn', kind: 'Nút chính', code: 'confirmLabel' },
    {
      shot: 'noroom', sel: `${DIALOG} .empty`, label: 'Không có phòng phù hợp', kind: 'Thông báo', code: 'moveOptions.length === 0',
      note: 'Kèm cảnh báo đỏ "Không gia hạn thêm {N} {đơn vị} được. Phòng {số} có đơn {mã} nhận phòng {giờ} và không còn phòng cùng giá để chuyển khách."',
    },
    {
      shot: 'noroom', sel: `${DIALOG} .alt`, label: 'Gợi ý thêm giờ tối đa', kind: 'Thông báo + nút phụ', code: 'suggestHours · useSuggestedHours()',
      note: 'Khi còn thêm được ≥ 1 giờ: "Vẫn có thể gia hạn theo giờ, tối đa đến {giờ}"; nút "Đổi sang thêm {n} giờ" đặt Thêm giờ = n rồi tính lại.',
    },
    { shot: 'noroom', sel: `${DIALOG} .p-dialog-footer button >> nth=1`, label: 'Gia hạn (bị khoá)', kind: 'Nút chính (khoá)', code: '!canConfirm()' },
  ],
  logic: [
    { title: 'LOGIC DIALOG GIA HẠN' },
    { h: '1. Mở dialog' },
    {
      list: [
        'Mỗi lần mở: đặt lại Thêm giờ × 1, Cộng vào lúc trả phòng, Tiền mặt, chưa chọn phòng chuyển; gọi xem trước.',
        'Mỗi lần đổi kiểu / số lượng / bấm gợi ý: POST /api/orders/{id}/extend/preview { type, quantity, collectNow, paymentMethod, targetRoomId } (không lưu). Lỗi hiện ở cuối dialog.',
        'Không giữ được phòng: chọn sẵn phòng đầu tiên trong danh sách chuyển (giữ phòng đang chọn nếu vẫn còn trong danh sách).',
      ],
    },
    { h: '2. Tính toán ở backend (OrderExtensionService.compute)' },
    {
      table: {
        cols: [{ h: 'Giá trị', w: 6 }, { h: 'Cách tính', w: 26 }],
        rows: [
          ['Chỉ đơn', 'Đang ở, Quá giờ, Chờ xác nhận trả; khác → 400 "Chỉ gia hạn được đơn khách đang ở".'],
          ['Giờ trả mới', 'checkOutAt hiện tại + N giờ (HOUR) hoặc + N ngày (DAY).'],
          ['Phí', 'N × giá mỗi giờ thêm snapshot (HOUR) hoặc N × giá ngày snapshot (DAY).'],
          ['Đơn kế tiếp', 'Chặng sớm nhất của đơn khác (chưa huỷ) ở phòng hiện tại, bắt đầu từ giờ trả hiện tại.'],
          ['Giờ trả tối đa', 'Giờ nhận đơn kế tiếp − 1 tiếng; maxExtraHours = số giờ nguyên từ giờ trả hiện tại tới đó.'],
          ['Giữ được phòng (available)', 'Không có đơn kế tiếp, hoặc giờ trả mới ≤ giờ trả tối đa.'],
          ['Phòng chuyển được', 'Khi không giữ được phòng: phòng khác, đủ 4 mức giá hiện hành bằng phòng đang ở, đang nhận đặt, không Chờ dọn, không có chặng (đơn chưa huỷ) giao [giờ trả hiện tại, giờ trả mới + 1 tiếng), không còn khách Quá giờ / Chờ xác nhận trả; sắp theo số phòng; kèm giờ nhận đơn kế tiếp của phòng đó (freeUntil).'],
        ],
      },
    },
    {
      note: 'Phòng còn khách chưa trả: chặng hiện tại của đơn Quá giờ / Chờ xác nhận trả (đã hết giờ hẹn nhưng chưa trả phòng) coi là kéo dài tới bây giờ + 1 tiếng, nên phòng đó không nằm trong danh sách phòng chuyển được (RentalOrderRepository.findOverlapping, tham số busyUntil).',
    },
    { h: '3. Xác nhận — POST /api/orders/{id}/extend' },
    {
      list: [
        'Tính lại như xem trước. Thu ngay mà không chọn hình thức → 400 "Chọn hình thức thu phí gia hạn".',
        'Giữ được phòng: dời giờ trả của đơn và cuối chặng cuối (extendTo).',
        'Không giữ được: thiếu targetRoomId → 409 "Phòng chỉ giữ được đến {HH:mm} vì đơn {mã} nhận phòng lúc {HH:mm}"; phòng không nằm trong danh sách → 409 "Phòng được chọn không chuyển sang được"; hợp lệ → thêm chặng mới ở phòng đó từ giờ trả cũ đến giờ trả mới, phòng của đơn = phòng mới (moveTo). Phòng cũ tự chuyển Chờ dọn khi chặng cũ kết thúc (tác vụ nền mỗi phút).',
        'Thêm dòng phụ thu "Gia hạn +N giờ/ngày" = phí; tổng tiền + phí. Thu ngay: thêm khoản thu "Thu khi gia hạn".',
        'Trạng thái về Đang ở (giờ trả mới vẫn đã qua thì tác vụ nền chuyển lại Quá giờ / Chờ xác nhận trả).',
        'Nhật ký ORDER_EXTENDED: "Gia hạn +2 giờ[, chuyển sang phòng 104][, thu 100.000đ tiền mặt]".',
        'Thành công: đóng dialog, chi tiết đơn cập nhật, màn cha (Đơn thuê / Lịch) tải lại.',
      ],
    },
    { h: '4. Sơ đồ luồng gia hạn' },
    { diagram: 'extend' },
  ],
  diagrams: {
    extend: `flowchart TD
  A([Bấm Gia hạn]) --> B[Chọn Thêm giờ / Thêm ngày, số lượng]
  B --> C[POST /orders/id/extend/preview]
  C --> D{Đơn kế tiếp ở phòng<br/>và giờ trả mới > giờ nhận đơn sau − 1h?}
  D -- Không --> E[Giữ được phòng<br/>Xác nhận gia hạn đến …]
  D -- Có --> F{Có phòng cùng giá,<br/>đã dọn, trống?}
  F -- Có --> G[Chọn phòng chuyển<br/>Chuyển sang … & gia hạn]
  F -- Không --> H[Khoá nút Gia hạn<br/>gợi ý Đổi sang thêm N giờ]
  H --> B
  E --> I[Chọn thu ngay / cộng lúc trả]
  G --> I
  I --> J[POST /orders/id/extend]
  J --> K([Đơn Đang ở · dòng phí Gia hạn +N<br/>· thêm chặng nếu chuyển phòng · nhật ký])`,
  },
};
