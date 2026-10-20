// Nội dung file 12_BangGia.xlsx: dialog Sửa bảng giá.
import { ROLES, fixVersion } from '../common.mjs';

const DIALOG = '.p-dialog';
const VIEWPORT = { width: 1440, height: 1100 };

/** Mở dialog Sửa bảng giá từ tab Bảng giá. */
const openDialog = async (page, ctx) => {
  await ctx.open(page, '/phong');
  await page.click('.tabs button:has-text("Bảng giá")');
  await page.click('button:has-text("Sửa bảng giá")');
  await page.locator(`${DIALOG} .ptbl tbody tr`).first().waitFor();
};

export default {
  file: '12_BangGia',
  title: 'Sửa bảng giá',
  kind: 'Dialog',
  route: 'Mở trên /phong, tab Bảng giá',
  summary: 'Sửa trong một lần: danh sách hạng phòng và 4 mức giá (thêm, sửa, ẩn, khôi phục hạng đã ẩn) và khung giờ chung (số giờ tối thiểu, giờ nhận/trả qua đêm, theo ngày). Giá mới chỉ áp dụng cho đơn tạo sau khi lưu.',
  access: ['Phòng & bảng giá → tab Bảng giá → "Sửa bảng giá".'],
  roles: ROLES.manager,
  related: ['10_Phong', '11_ThemSuaPhong (giá riêng của phòng)', '08_TaoSuaDon (cách tính tiền theo loại thuê)', '00_TongThe (bảng room_type, pricing_settings)'],
  sources: [
    'frontend/src/app/pages/rooms/pricing-dialog.{ts,html,scss}',
    'backend/.../room/PricingController.java (GET/PUT /room-types/overview), PricingService, PricingOverviewUpdateRequest, RoomTypeUpsertItem, PricingSettingsDto',
  ],
  history: fixVersion('Tên cột "{N} giờ đầu" đổi ngay theo số giờ tối thiểu đang nhập; ô thiếu tô đỏ + hộp lỗi khi lưu; giới hạn độ dài tên hạng.'),
  shots: [
    { id: 'main', caption: 'Dialog Sửa bảng giá', viewport: VIEWPORT, fullPage: false, clip: DIALOG, go: openDialog },
    {
      id: 'error',
      caption: 'Ẩn hạng còn phòng: lưu bị từ chối',
      viewport: VIEWPORT,
      fullPage: false,
      clip: DIALOG,
      go: async (page, ctx) => {
        await openDialog(page, ctx);
        await page.click(`${DIALOG} button[aria-label="Ẩn dòng 1"]`);
        await page.click(`${DIALOG} .p-dialog-footer button:has-text("Lưu bảng giá")`);
        await page.locator(`${DIALOG} .err`).waitFor();
      },
    },
  ],
  items: [
    { sel: `${DIALOG} .sub`, label: 'Ghi chú áp dụng', kind: 'Chữ (tĩnh)', code: '.sub', note: '"Giá mới chỉ áp dụng cho đơn tạo sau khi lưu. Đơn đã có giữ nguyên giá lúc đặt."' },
    {
      sel: `${DIALOG} .ptbl tbody tr >> nth=0 >> td.cls`, label: 'Tên hạng phòng', kind: 'Ô nhập chữ', code: 'rows[i].name', dataType: 'string', required: 'Có',
      rule: 'Không trùng tên hạng khác trong danh sách (không phân biệt hoa thường, bỏ khoảng trắng đầu cuối). Tối đa 100 ký tự.',
      note: 'Dưới ô: các số phòng đang dùng hạng.',
    },
    {
      sel: `${DIALOG} .ptbl tbody tr >> nth=0 >> td >> nth=1`, label: '{N} giờ đầu', kind: 'Ô nhập số (đ)', code: 'rows[i].twoHourPrice', dataType: 'số nguyên (VND)',
      required: 'Có', rule: '≥ 0.', note: 'Giá cho số giờ tối thiểu đầu tiên. Tên cột "{N} giờ đầu" đổi ngay khi sửa ô số giờ tối thiểu (minHours()).',
    },
    { sel: `${DIALOG} .ptbl tbody tr >> nth=0 >> td >> nth=2`, label: 'Mỗi giờ thêm', kind: 'Ô nhập số (đ)', code: 'rows[i].extraHourPrice', dataType: 'số nguyên (VND)', required: 'Có', rule: '≥ 0.', note: 'Cũng là mức phụ thu quá giờ và phí gia hạn theo giờ.' },
    { sel: `${DIALOG} .ptbl tbody tr >> nth=0 >> td >> nth=3`, label: 'Qua đêm', kind: 'Ô nhập số (đ)', code: 'rows[i].overnightPrice', dataType: 'số nguyên (VND)', required: 'Có', rule: '≥ 0.' },
    { sel: `${DIALOG} .ptbl tbody tr >> nth=0 >> td >> nth=4`, label: 'Theo ngày', kind: 'Ô nhập số (đ)', code: 'rows[i].dailyPrice', dataType: 'số nguyên (VND)', required: 'Có', rule: '≥ 0.', note: 'Cũng là phí gia hạn theo ngày.' },
    {
      sel: `${DIALOG} .ptbl tbody tr >> nth=0 >> .ibtn`, label: 'Ẩn hạng', kind: 'Nút icon (thùng rác)', code: 'removeRow(i)', badge: 'right',
      note: 'Bỏ dòng khỏi form; khi lưu hạng bị ẩn (xoá mềm). Hạng còn phòng dùng → lưu bị từ chối (ảnh 2).',
    },
    { sel: `${DIALOG} .link-btn:has-text("Thêm hạng phòng")`, label: 'Thêm hạng phòng', kind: 'Nút chữ', code: 'addRow()', note: 'Thêm dòng trống (tên rỗng, giá 0).' },
    { sel: `${DIALOG} .hint >> nth=0`, label: 'Ghi chú ẩn hạng', kind: 'Chữ (tĩnh)', code: '.hint', note: 'Không ẩn được hạng còn phòng; phòng giá riêng không bị ảnh hưởng; đơn đã tạo giữ nguyên giá và tên hạng lúc đặt.' },
    {
      sel: `${DIALOG} .hidden-list`, label: 'Hạng phòng đã ẩn · Khôi phục', kind: 'Danh sách + nút chữ', code: 'hiddenTypes · restoreType(t)',
      note: 'Chỉ hiện khi có hạng đã ẩn. Khôi phục: đưa hạng về bảng phía trên (lưu mới áp dụng).',
    },
    { sel: `${DIALOG} #minh`, label: 'Theo giờ: số giờ tối thiểu', kind: 'Ô nhập số', code: 'settingsForm.minHours', dataType: 'số nguyên', required: 'Có', rule: '≥ 1.', note: 'Đơn theo giờ phải thuê ≥ số giờ này. Gợi ý dưới ô: "Cột giá "… giờ đầu" đổi theo số này" — tên cột giá giờ đầu trong dialog, tab Bảng giá, thẻ phòng, màn Thêm/Sửa phòng đều theo số này.' },
    {
      sel: `${DIALOG} .field:has-text("Qua đêm") .g2`, label: 'Qua đêm: giờ nhận → giờ trả hôm sau', kind: 'Ô giờ × 2', code: 'settingsForm.overnightCheckIn, overnightCheckOut',
      dataType: 'time (HH:mm)', required: 'Có', note: 'Đơn qua đêm luôn nhận lúc giờ nhận ngày đã chọn, trả lúc giờ trả hôm sau.',
    },
    {
      sel: `${DIALOG} .field:has-text("Theo ngày") .g2`, label: 'Theo ngày: giờ nhận → giờ trả', kind: 'Ô giờ × 2', code: 'settingsForm.dailyCheckIn, dailyCheckOut',
      dataType: 'time (HH:mm)', required: 'Có', note: 'Đơn N ngày: nhận giờ nhận ngày đầu, trả giờ trả sau N ngày.',
    },
    { sel: `${DIALOG} .p-dialog-footer`, label: 'Huỷ · Lưu bảng giá', kind: 'Nút phụ + nút chính', code: 'cancel() · save()', badge: 'right', note: 'Huỷ / nút X: đóng, không lưu. Lưu: gửi toàn bộ bảng (ảnh 2 nếu lỗi).' },
    { shot: 'error', sel: `${DIALOG} .err`, label: 'Hộp báo lỗi', kind: 'Thông báo lỗi', code: 'errorMessage', note: 'Detail lỗi từ server, vd "Không ẩn được hạng còn phòng: Tiêu chuẩn". Dialog giữ nguyên để sửa.' },
  ],
  logic: [
    { title: 'LOGIC DIALOG SỬA BẢNG GIÁ' },
    { h: '1. Mở dialog' },
    { list: ['Nạp từ dữ liệu tab Bảng giá đang có (GET /room-types/overview): mỗi hạng đang dùng một dòng, danh sách hạng đã ẩn, khung giờ chung.'] },
    { h: '2. Lưu — PUT /api/room-types/overview' },
    {
      list: [
        'Frontend: ô trống / giá âm / số giờ tối thiểu < 1 → tô đỏ ô, hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ).", không gửi. Tên hạng tối đa 100 ký tự (maxlength).',
        'Gửi { roomTypes: [{ id (null = hạng mới), name, twoHourPrice, extraHourPrice, overnightPrice, dailyPrice }], settings: { minHours, overnightCheckIn, overnightCheckOut, dailyCheckIn, dailyCheckOut } }.',
        'Backend: tên trùng trong danh sách → 400. Mỗi dòng: id null → tạo hạng mới; có id → sửa và đặt active = 1 (khôi phục nếu đang ẩn).',
        'Hạng đang dùng mà không có trong danh sách gửi lên → ẩn (active = 0); còn phòng dùng hạng đó → 409, không lưu gì (cùng transaction).',
        'Cập nhật khung giờ chung (bảng pricing_settings, 1 dòng). Trả lại dữ liệu mới → dialog đóng, màn Phòng tải lại.',
        'Đơn đã tạo không đổi (đã lưu snapshot giá); phòng giá riêng không đổi. Không ghi nhật ký thao tác.',
      ],
    },
    { h: '3. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 12 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Ẩn hạng còn phòng', 409, 'Không ẩn được hạng còn phòng: {tên hạng}'],
          ['Tên hạng trùng', 400, 'Tên hạng phòng bị trùng trong danh sách'],
          ['Ẩn hết mọi hạng (danh sách rỗng)', 400, 'Dữ liệu không hợp lệ (errors.roomTypes: "Phải có ít nhất một hạng phòng")'],
          ['Hạng không tồn tại', 404, 'Hạng phòng không tồn tại'],
          ['Thiếu ô / giá âm / số giờ tối thiểu < 1', 'frontend', 'Vui lòng nhập đủ các ô bắt buộc (viền đỏ).'],
          ['Tên hạng quá 100 ký tự (gọi thẳng API)', 400, 'Dữ liệu không hợp lệ — errors["roomTypes[i].name"]: "Tối đa 100 ký tự"'],
          ['Nhân viên gọi API', 403, 'Không có quyền thực hiện'],
          ['Lỗi khác', '—', 'Không lưu được bảng giá, thử lại sau.'],
        ],
      },
    },
  ],
};
