// Nội dung file 08_TaoSuaDon.xlsx: màn Tạo đơn / Sửa đơn thuê.
import { ROLES, fixVersion } from '../common.mjs';
import { addDays, ymd } from '../../lib/time.mjs';

/**
 * Mở màn Tạo đơn (có thể điền sẵn qua query), chờ tóm tắt tính xong.
 * @param {string} query query string, vd "?roomId=5"
 */
const openCreate = async (page, ctx, query = '') => {
  await ctx.open(page, '/don-thue/tao-moi' + query);
  await page.locator('.sum .tot, .avail.bad').first().waitFor();
};

/** Điền thông tin khách và tiền cọc mẫu. */
const fillGuest = async (page) => {
  await page.fill('#phone', '0938 456 789');
  await page.fill('#name', 'Hồ Gia Bảo');
  await page.fill('#idn', '079203004455');
  await page.fill('#note', 'Khách đến khoảng 15 phút trước giờ nhận.');
  await page.fill('#dep', '100000');
};

/** Chờ tóm tắt tính lại sau khi sửa form (debounce 300ms + gọi API). */
const settle = async (page) => {
  await page.waitForTimeout(600);
  await page.waitForLoadState('networkidle');
};

export default {
  file: '08_TaoSuaDon',
  title: 'Tạo / Sửa đơn thuê',
  kind: 'Màn hình',
  route: '/don-thue/tao-moi[?roomId=&date=YYYY-MM-DD&time=HH:00] · /don-thue/{id}/sua',
  summary: 'Nhập đơn sau khi chốt với khách: 3 bước (Phòng & thời gian · Thông tin khách · Đặt cọc & giảm giá), giờ trả và tiền tự tính bằng API xem trước, báo phòng trống / trùng lịch ngay khi điền; cột phải là tóm tắt đơn và nút lưu. Cùng màn dùng để sửa đơn còn Đã đặt.',
  access: [
    'Nút "Tạo đơn thuê" trên thanh trên cùng (mọi màn) hoặc ở màn Đơn thuê.',
    'Lịch đặt phòng: bấm ô trống → điền sẵn phòng, ngày (và giờ khi xem theo ngày).',
    'Chi tiết đơn Đã đặt → "Sửa đơn".',
  ],
  roles: `${ROLES.all}. Nhân viên sửa đơn không đổi được tiền cọc, hình thức cọc.`,
  related: ['07_ChiTietDon', '05_LichDatPhong', '10_Phong (bảng giá, giờ qua đêm/theo ngày)', '13_PhuThu', '00_TongThe'],
  sources: [
    'frontend/src/app/pages/orders/order-form-page.{ts,html,scss}',
    'frontend/src/app/core/order.service.ts (preview, create, update), room.service.ts',
    'backend/.../order/OrderController.java (POST /orders/preview, POST /orders, PUT /orders/{id}), OrderService (preview, create, update, fill, computeSchedule), OrderUpsertRequest',
  ],
  history: fixVersion('Phòng còn khách Quá giờ / Chờ xác nhận trả coi là bận tới bây giờ + 1 tiếng (ảnh 3); ô bắt buộc thiếu tô đỏ + hộp lỗi khi lưu (ảnh 6); giới hạn độ dài ô chữ.'),
  shots: [
    {
      id: 'create',
      caption: 'Tạo đơn theo giờ, khách tự check-in',
      go: async (page, ctx) => {
        await openCreate(page, ctx, `?roomId=${ctx.room['104']}`);
        await fillGuest(page);
        await page.fill('#code', '246810');
        await settle(page);
      },
    },
    {
      id: 'conflict',
      caption: 'Trùng lịch với đơn khác',
      note: 'Phòng đã có đơn trong khung giờ: báo lỗi đỏ, khoá nút lưu.',
      fullPage: false,
      go: async (page, ctx) => {
        await openCreate(page, ctx, `?roomId=${ctx.room['101']}&date=${ymd(ctx.now)}&time=${String(ctx.now.getHours()).padStart(2, '0')}:00`);
      },
    },
    {
      id: 'occupied',
      caption: 'Phòng còn khách quá giờ chưa trả',
      note: 'Phòng 102 có đơn Quá giờ: giờ hẹn trả đã qua nhưng phòng vẫn bận tới bây giờ + 1 tiếng.',
      fullPage: false,
      go: async (page, ctx) => {
        await openCreate(page, ctx, `?roomId=${ctx.room['102']}&date=${ymd(ctx.now)}&time=${String(ctx.now.getHours()).padStart(2, '0')}:00`);
      },
    },
    {
      id: 'daily',
      caption: 'Thuê theo ngày, vượt số khách tối đa',
      go: async (page, ctx) => {
        await openCreate(page, ctx, `?roomId=${ctx.room['301']}&date=${ymd(addDays(ctx.now, 5))}`);
        await page.click('.types label:has-text("Theo ngày")');
        await page.click('button[aria-label="Thêm 1 ngày"]');
        await page.fill('#g', '6');
        await settle(page);
      },
    },
    {
      id: 'missingCode',
      caption: 'Lưu đơn khách tự check-in khi chưa nhập mã cửa',
      fullPage: false,
      go: async (page, ctx) => {
        await openCreate(page, ctx, `?roomId=${ctx.room['104']}`);
        await fillGuest(page);
        await settle(page);
        await page.click('.sum-a .btn-p');
        await page.locator('.ph + .err').waitFor();
      },
    },
    {
      id: 'missingGuest',
      caption: 'Lưu đơn khi chưa nhập họ tên, số điện thoại',
      go: async (page, ctx) => {
        await openCreate(page, ctx, `?roomId=${ctx.room['104']}`);
        await page.click('.sum-a .btn-p');
        await page.locator('.ph + .err').waitFor();
      },
    },
    {
      id: 'edit',
      caption: 'Sửa đơn (Quản lý)',
      go: async (page, ctx) => {
        await ctx.open(page, `/don-thue/${ctx.order.family}/sua`);
        await page.locator('.sum .tot').waitFor();
      },
    },
    {
      id: 'staffEdit',
      caption: 'Sửa đơn (Nhân viên): không sửa được tiền cọc',
      role: 'staff',
      clip: '.card:has(h2:has-text("Đặt cọc"))',
      go: async (page, ctx) => {
        await ctx.open(page, `/don-thue/${ctx.order.next101}/sua`);
        await page.locator('.sum .tot').waitFor();
      },
    },
  ],
  items: [
    { sel: '.ph', label: 'Đường dẫn + tiêu đề', kind: 'Chữ', code: 'editing()', note: '"Đơn thuê › Tạo mới" / "Đơn thuê › Sửa đơn"; tiêu đề "Tạo đơn thuê" / "Sửa đơn {mã}". Link "Đơn thuê" về danh sách.' },
    {
      sel: 'fieldset.types >> nth=0', label: 'Loại thuê', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.rentalType', dataType: 'HOURLY | OVERNIGHT | DAILY',
      required: 'Có', default: 'Theo giờ', note: 'Đổi loại thuê đặt lại số lượng: Theo ngày = 1, còn lại = 2. Qua đêm không có ô giờ nhận, số lượng (giờ cố định theo bảng giá).',
    },
    {
      sel: '#room', label: 'Phòng', kind: 'Ô chọn', code: 'form.controls.roomId', dataType: 'id phòng', required: 'Có',
      rule: 'Chỉ phòng đang nhận đặt (sửa đơn: thêm phòng hiện tại của đơn). Hiển thị "{số} · {tên} ({hạng phòng})".',
      default: 'roomId trên URL, không có thì phòng đầu tiên', note: 'Đổi phòng → Nhận & trả phòng đặt theo hình thức mặc định của phòng.',
    },
    { sel: '#d', label: 'Ngày nhận', kind: 'Ô ngày', code: 'form.controls.checkInDate', dataType: 'date', required: 'Có', default: 'date trên URL, không có thì ngày của giờ tròn gần nhất' },
    {
      sel: '#t', label: 'Giờ nhận', kind: 'Ô giờ', code: 'form.controls.checkInTime', dataType: 'time (HH:mm)', required: 'Có (Theo giờ)',
      default: 'time trên URL, không có thì giờ tròn gần nhất (từ phút 30 làm tròn lên)', note: 'Chỉ hiện khi Theo giờ.',
    },
    {
      sel: '.field:has(label[for=h]) .stepper', label: 'Số giờ thuê', kind: 'Ô số + nút −/+', code: 'form.controls.quantity · stepQuantity()', dataType: 'số nguyên',
      required: 'Có', rule: '≥ 1 ở frontend; backend: ≥ số giờ tối thiểu (mặc định 2) — nhỏ hơn thì không xem trước được.', default: '2',
    },
    {
      sel: '.field.span2', label: 'Giờ trả (tự tính)', kind: 'Ô chỉ đọc', code: 'preview().checkOutAt', dataType: 'ngày giờ',
      rule: '"HH:mm · dd/MM/yyyy". Theo giờ: giờ nhận + số giờ; Qua đêm: ngày nhận giờ qua đêm → hôm sau giờ trả qua đêm; Theo ngày: giờ nhận theo ngày → +N ngày giờ trả theo ngày.',
      note: '"—" khi chưa tính được.',
    },
    {
      sel: '.avail', label: 'Tình trạng phòng', kind: 'Thông báo', code: 'preview().available · conflictMessage',
      note: 'Xanh "Phòng trống trong khung giờ này." / đỏ "Phòng đã có đơn {mã} trong khung giờ này" (ảnh 2) hoặc "Phòng còn khách đơn {mã} chưa trả phòng" (ảnh 3).',
    },
    {
      sel: 'fieldset.types.two', label: 'Nhận & trả phòng', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.checkInMode', dataType: 'SELF | STAFF',
      required: 'Có', default: 'Hình thức mặc định của phòng', note: 'Khách tự check-in / check-out · Nhân viên đón khách.',
    },
    {
      sel: '.field:has(#code) .iw', label: 'Mã cửa cho đơn này', kind: 'Ô nhập mật khẩu + nút mắt', code: 'form.controls.doorCode · showDoorCode', dataType: 'string',
      required: 'Có (khách tự check-in)', rule: 'Tối đa 20 ký tự. Lưu mã hoá AES. Sửa đơn: để trống = giữ mã cũ (placeholder "Để trống để giữ mã cũ").', default: '(trống)',
      note: 'Chỉ hiện khi Khách tự check-in. Nút mắt hiện/ẩn mã đang gõ.',
    },
    { sel: '#phone', label: 'Số điện thoại', kind: 'Ô nhập (tel)', code: 'form.controls.guestPhone', dataType: 'string', required: 'Có', rule: 'Không để trống. Tối đa 20 ký tự.' },
    { sel: '#name', label: 'Họ tên', kind: 'Ô nhập chữ', code: 'form.controls.guestName', dataType: 'string', required: 'Có', rule: 'Không để trống. Tối đa 100 ký tự.' },
    {
      sel: '#idn', label: 'CCCD / Hộ chiếu', kind: 'Ô nhập', code: 'form.controls.guestIdNumber', dataType: 'string', required: 'Không',
      rule: 'Tối đa 20 ký tự. Bỏ khoảng trắng rồi mã hoá AES; lưu thêm 4 ký tự cuối để hiển thị che. Sửa đơn: để trống = giữ.', default: '(trống)',
    },
    {
      sel: '.field:has(#g) .stepper', label: 'Số khách', kind: 'Ô số + nút −/+', code: 'form.controls.guestCount · stepGuestCount()', dataType: 'số nguyên',
      required: 'Có', rule: '≥ 1. Vượt số khách tối đa của phòng → phụ thu "Vượt số khách" × số khách vượt.', default: '2',
    },
    {
      sel: '#src', label: 'Nguồn đặt', kind: 'Ô chọn', code: 'form.controls.source', dataType: 'ZALO | FACEBOOK | PHONE | REGULAR | OTHER', required: 'Có',
      default: 'Zalo', note: 'Zalo · Facebook · Gọi điện · Khách quen · Khác.',
    },
    { sel: '#note', label: 'Ghi chú', kind: 'Ô nhập nhiều dòng', code: 'form.controls.note', dataType: 'string', required: 'Không', rule: 'Tối đa 1000 ký tự (cột DB).', default: '(trống)' },
    {
      sel: '.field:has(#dep)', label: 'Tiền cọc', kind: 'Ô nhập số (đ)', code: 'form.controls.deposit · depositError()', dataType: 'số nguyên (VND)', required: 'Có',
      rule: '> 0 và ≤ tổng tiền đang xem trước. Lỗi dưới ô: "Bắt buộc nhập tiền cọc lớn hơn 0" / "Tiền cọc không được vượt tổng tiền".', default: '0',
    },
    { sel: '.radios', label: 'Hình thức cọc', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.depositMethod', dataType: 'TRANSFER | CASH', required: 'Có', default: 'Chuyển khoản' },
    { sel: '#disc', label: 'Giảm giá', kind: 'Ô nhập số (đ)', code: 'form.controls.discount', dataType: 'số nguyên (VND)', required: 'Không', rule: '≥ 0. Tổng = max(0, tiền phòng + phụ thu − giảm giá).', default: '0' },
    { sel: '#why', label: 'Lý do giảm', kind: 'Ô nhập chữ', code: 'form.controls.discountReason', dataType: 'string', required: 'Không', rule: 'Tối đa 255 ký tự.', default: '(trống)' },
    { sel: '.sum .ch', label: 'Tóm tắt đơn · loại thuê', kind: 'Tiêu đề + tag', code: 'rentalTypeLabel', note: 'Kèm dòng "{số} · {tên phòng}" đang chọn.' },
    {
      sel: '.sum-b .li >> nth=0', label: 'Tiền phòng và phụ thu', kind: 'Dòng tiền', code: 'preview().roomPriceAmount, surcharges[]', dataType: 'tiền',
      note: 'Phụ thu tự động: vượt số khách, theo ngày (cuối tuần, lễ Tết…). Quá giờ và thêm tay tính lúc trả phòng.',
    },
    { sel: '.sum .tot', label: 'Tổng tiền', kind: 'Dòng tiền (đậm)', code: 'preview().totalAmount', dataType: 'tiền' },
    { sel: '.sum .li.due', label: 'Thu khi nhận phòng', kind: 'Dòng tiền', code: 'preview().dueAmount', dataType: 'tiền', rule: 'max(0, tổng − tiền cọc). Dòng trên: "Đã cọc −{tiền cọc}".' },
    {
      sel: '.sum-a .btn-p', label: 'Lưu đơn / Lưu thay đổi', kind: 'Nút chính', code: 'submit(false)',
      note: 'Khoá khi đang lưu, chưa có kết quả xem trước hoặc phòng không trống. Lưu xong → /don-thue?id={id} (mở chi tiết đơn).',
    },
    {
      sel: '.sum-a .btn-s', label: 'Lưu & sao chép tin nhắn', kind: 'Nút phụ', code: 'submit(true)',
      note: 'Chỉ khi tạo mới. Lưu xong → /don-thue?id={id}&action=copy: chi tiết đơn tự sao chép tin nhắn theo mẫu mặc định.',
    },
    { sel: '.sum-a .btn-t', label: 'Huỷ', kind: 'Link', code: 'routerLink="/don-thue"', note: 'Không lưu, về Đơn thuê (sửa đơn: mở lại đơn đó).' },
    { shot: 'conflict', sel: '.avail.bad', label: 'Báo trùng lịch', kind: 'Thông báo (đỏ)', code: 'preview().conflictMessage', note: '"Phòng đã có đơn SH-xxxx trong khung giờ này" — kiểm tra theo chặng của các đơn chưa huỷ ở phòng đó.' },
    {
      shot: 'occupied', sel: '.avail.bad', label: 'Báo phòng còn khách', kind: 'Thông báo (đỏ)', code: 'preview().conflictMessage',
      note: '"Phòng còn khách đơn SH-xxxx chưa trả phòng": chặng hiện tại của đơn Quá giờ / Chờ xác nhận trả coi là kéo dài tới bây giờ + 1 tiếng. Đặt giờ nhận sau mốc đó thì vẫn trống.',
    },
    { shot: 'daily', sel: '.field:has(#days) .stepper', label: 'Số ngày thuê', kind: 'Ô số + nút −/+', code: 'form.controls.quantity', dataType: 'số nguyên', required: 'Có', rule: '≥ 1.', default: '1', note: 'Chỉ khi Theo ngày.' },
    { shot: 'daily', sel: '.sum-b .li:has-text("Vượt")', label: 'Phụ thu vượt số khách', kind: 'Dòng tiền', code: "surcharges[] (EXTRA_GUEST)", note: 'Số khách 6 > tối đa 4 của phòng → 2 khách × mức phụ thu.' },
    {
      shot: 'missingCode', sel: '.ph + .err', label: 'Hộp báo lỗi', kind: 'Thông báo lỗi', code: 'errorMessage',
      note: 'Lỗi frontend ("Phải nhập mã cửa khi khách tự check-in.") hoặc detail lỗi từ server khi lưu (xem sheet 4).',
    },
    {
      shot: 'missingGuest', sel: '.ph + .err', label: 'Hộp lỗi ô bắt buộc', kind: 'Thông báo lỗi', code: 'rejectInvalid() (core/form-errors.ts)',
      note: '"Vui lòng nhập đủ các ô bắt buộc (viền đỏ)." Không gửi request.',
    },
    {
      shot: 'missingGuest', sel: '#name', label: 'Ô bắt buộc chưa nhập', kind: 'Ô nhập (viền đỏ)', code: '.inp.ng-invalid.ng-touched (styles.scss)',
      note: 'Ô bắt buộc trống / không hợp lệ đã chạm (hoặc đã bấm Lưu) có viền đỏ (ở ảnh: Số điện thoại, Họ tên, Tiền cọc); bấm Lưu thì con trỏ nhảy tới ô lỗi đầu tiên.',
    },
    { shot: 'edit', sel: '.ph h1', label: 'Tiêu đề Sửa đơn', kind: 'Chữ', code: "'Sửa đơn ' + editing().code", note: 'Đơn không còn Đã đặt: hộp lỗi "Chỉ sửa được đơn ở trạng thái Đã đặt." (vẫn mở form, lưu sẽ bị từ chối).' },
    { shot: 'edit', sel: '#idn', label: 'CCCD khi sửa', kind: 'Ô nhập', code: 'placeholder', note: 'Placeholder "•••••••• 1234 (để trống để giữ)".' },
    { shot: 'edit', sel: '.sum-a', label: 'Nút khi sửa', kind: 'Nhóm nút', code: 'editing() !== null', note: 'Chỉ còn "Lưu thay đổi" và "Huỷ" (không có Lưu & sao chép).' },
    {
      shot: 'staffEdit', sel: '.field-err.g-full', label: 'Nhắc quyền sửa cọc', kind: 'Chữ (đỏ)', code: '!isManager()',
      note: '"Chỉ Quản lý được sửa tiền cọc." — ô Tiền cọc và Hình thức cọc bị khoá (disable) với Nhân viên khi sửa đơn.',
    },
  ],
  logic: [
    { title: 'LOGIC MÀN TẠO / SỬA ĐƠN' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Đọc query (tạo mới từ Lịch): date, time điền vào Ngày nhận, Giờ nhận; roomId chọn sẵn phòng.',
        'Song song: GET /api/rooms và (sửa) GET /api/orders/{id}. Danh sách phòng = phòng đang nhận đặt (+ phòng hiện tại của đơn khi sửa).',
        'Tạo mới: chọn phòng theo roomId hoặc phòng đầu tiên, Nhận & trả phòng = mặc định của phòng.',
        'Sửa: đặt Loại thuê và Phòng trước (2 ô này tự đặt lại số lượng / hình thức), rồi điền phần còn lại; số giờ = (trả − nhận) theo giờ, số ngày = chênh lệch ngày. Mã cửa, CCCD để trống. Nhân viên: khoá Tiền cọc, Hình thức cọc.',
      ],
    },
    { h: '2. Xem trước (tự tính khi gõ)' },
    {
      list: [
        'Mỗi lần form đổi (chờ 300ms sau lần gõ cuối): POST /api/orders/preview { roomId, rentalType, checkInDate, checkInTime (chỉ Theo giờ), quantity (trừ Qua đêm), guestCount, discount, deposit, excludeOrderId (đơn đang sửa) }. Không lưu DB.',
        'Backend (cùng hàm với lúc lưu): tính giờ nhận/trả, tiền phòng theo giá áp dụng của phòng (theo hạng hoặc giá riêng), phụ thu tự động, kiểm tra trùng lịch → trả checkInAt, checkOutAt, available, conflictMessage, roomPriceAmount, surcharges, totalAmount, dueAmount.',
        'Lỗi xem trước (vd số giờ < tối thiểu): bỏ kết quả, tóm tắt hiện "Chọn phòng và thời gian để xem tóm tắt.", nút lưu bị khoá.',
      ],
    },
    {
      table: {
        cols: [{ h: 'Loại thuê', w: 4 }, { h: 'Giờ nhận → trả', w: 13 }, { h: 'Tiền phòng', w: 15 }],
        rows: [
          ['Theo giờ', 'Ngày + giờ nhận → + số giờ (≥ số giờ tối thiểu)', 'Giá "{số giờ tối thiểu} giờ đầu" + (số giờ − số giờ tối thiểu) × giá mỗi giờ thêm'],
          ['Qua đêm', 'Ngày nhận, giờ nhận qua đêm → hôm sau, giờ trả qua đêm (luôn 1 đêm)', 'Giá qua đêm'],
          ['Theo ngày', 'Ngày nhận, giờ nhận theo ngày → + số ngày, giờ trả theo ngày', 'Giá ngày × số ngày'],
        ],
      },
    },
    {
      note: 'Phụ thu tự động lúc tạo: vượt số khách (mức × số khách vượt) và theo ngày — mỗi ngày ở (Theo giờ / Qua đêm: ngày nhận) lấy mức cao nhất trong các phụ thu "Ngày trong tuần" / "Khoảng ngày" khớp ngày đó, % tính trên giá của ngày. Đơn lưu snapshot tên hạng + 4 mức giá + từng dòng phụ thu (không đổi khi bảng giá đổi sau này).',
    },
    { h: '3. Lưu' },
    {
      list: [
        'Frontend chặn: form thiếu ô bắt buộc → tô đỏ ô, hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ)."; lỗi tiền cọc (dưới ô); khách tự check-in mà chưa có mã cửa (tạo mới, hoặc sửa đơn chưa có mã) → hộp lỗi.',
        'Tạo: POST /api/orders; Sửa: PUT /api/orders/{id}. Thành công → /don-thue?id={id} (Lưu & sao chép: thêm action=copy).',
        'Backend tạo: phòng phải đang nhận đặt; tính lại như xem trước; trùng lịch → 409; cọc > tổng → 400; mã hoá CCCD, mã cửa; tạo 1 chặng; trạng thái Đã đặt. Nhật ký ORDER_CREATED "Tạo đơn".',
        'Backend sửa: chỉ đơn Đã đặt; Nhân viên đổi cọc / hình thức cọc → 403; đổi sang phòng khác đang tắt nhận đặt → 400; tính lại theo bảng giá hiện hành, bỏ qua chính đơn khi kiểm tra trùng; tổng mới < đã thu → 400. Nhật ký ORDER_UPDATED "Sửa đơn".',
      ],
    },
    { h: '4. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 12 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Khách tự check-in, chưa nhập mã cửa', '400 / frontend', 'Phải nhập mã cửa khi khách tự check-in'],
          ['Trùng lịch', 409, 'Phòng đã có đơn {mã} trong khung giờ này'],
          ['Giờ nhận trước bây giờ + 1 tiếng, phòng còn khách Quá giờ / Chờ xác nhận trả', 409, 'Phòng còn khách đơn {mã} chưa trả phòng'],
          ['Thiếu ô bắt buộc', 'frontend', 'Vui lòng nhập đủ các ô bắt buộc (viền đỏ).'],
          ['Ô chữ quá dài (gọi thẳng API)', 400, 'Dữ liệu không hợp lệ — errors.{trường}: "Tối đa N ký tự"'],
          ['Tiền cọc vượt tổng', '400 / dưới ô', 'Tiền cọc không được vượt tổng tiền'],
          ['Tiền cọc ≤ 0', '400 / dưới ô', 'Phải lớn hơn 0 / Bắt buộc nhập tiền cọc lớn hơn 0'],
          ['Theo giờ thiếu giờ nhận', 400, 'Phải nhập giờ nhận phòng cho đơn theo giờ'],
          ['Số giờ < tối thiểu', 400, 'Số giờ thuê tối thiểu {n} giờ'],
          ['Số ngày < 1', 400, 'Số ngày thuê tối thiểu 1 ngày'],
          ['Phòng tắt nhận đặt (tạo)', 400, 'Phòng đang tắt nhận đặt, không tạo được đơn mới'],
          ['Chuyển sang phòng tắt nhận đặt (sửa)', 400, 'Phòng đang tắt nhận đặt, không chuyển đơn sang được'],
          ['Sửa đơn không ở Đã đặt', 400, 'Chỉ sửa được đơn ở trạng thái Đã đặt'],
          ['Nhân viên sửa tiền cọc', 403, 'Chỉ Quản lý được sửa tiền cọc'],
          ['Tổng mới thấp hơn đã thu', 400, 'Tổng tiền mới thấp hơn số đã thu'],
          ['Thiếu trường bắt buộc (gọi thẳng API)', 400, 'Dữ liệu không hợp lệ (errors: "Bắt buộc nhập", "Phải lớn hơn 0"…)'],
          ['Lỗi khác / mất kết nối', '—', 'Không tạo được đơn, thử lại sau. / Không lưu được đơn, thử lại sau.'],
        ],
      },
    },
    { h: '5. Sơ đồ luồng tạo đơn' },
    { diagram: 'create' },
  ],
  diagrams: {
    create: `flowchart TD
  A([Mở Tạo đơn<br/>từ nút Tạo đơn thuê / ô trống ở Lịch]) --> B[Chọn loại thuê, phòng,<br/>ngày, giờ, số giờ/ngày]
  B --> C[POST /orders/preview<br/>sau 300ms mỗi lần đổi]
  C --> D{Phòng trống?}
  D -- Không --> E[Báo trùng đơn SH-xxxx<br/>khoá nút lưu] --> B
  D -- Có --> F[Tóm tắt: tiền phòng, phụ thu,<br/>tổng, thu khi nhận]
  F --> G[Nhập khách, hình thức check-in,<br/>mã cửa, cọc, giảm giá]
  G --> H{Bấm Lưu đơn /<br/>Lưu & sao chép}
  H --> I{Hợp lệ?<br/>cọc 0 < cọc ≤ tổng,<br/>có mã cửa nếu khách tự}
  I -- Không --> G
  I -- Có --> J[POST /orders]
  J --> K{Kết quả}
  K -- "400 / 409" --> L[Hộp lỗi] --> G
  K -- 200 --> M([Đơn Đã đặt · nhật ký Tạo đơn])
  M --> N{Lưu & sao chép?}
  N -- Có --> O([Đơn thuê ?id=…&action=copy<br/>tự sao chép tin nhắn])
  N -- Không --> P([Đơn thuê ?id=…])`,
  },
};
