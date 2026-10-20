// Nội dung file 13_PhuThu.xlsx: dialog Thêm / Sửa phụ thu (5 trường hợp "Áp dụng khi").
import { ROLES, fixVersion } from '../common.mjs';

const DIALOG = '.p-dialog';
const VIEWPORT = { width: 1440, height: 1100 };

/** Mở tab Phụ thu của màn Phòng. */
const openTab = async (page, ctx) => {
  await ctx.open(page, '/phong');
  await page.click('.tabs button:has-text("Phụ thu")');
  await page.locator('.fee').first().waitFor();
};

/**
 * Shot sửa một phụ thu có sẵn.
 * @param {string} name tên phụ thu trong dữ liệu mẫu
 */
const edit = (id, caption, name) => ({
  id, caption, viewport: VIEWPORT, fullPage: false, clip: DIALOG,
  go: async (page, ctx) => {
    await openTab(page, ctx);
    await page.click(`.fee:has-text("${name}")`);
    await page.locator(`${DIALOG} #s-name`).waitFor();
  },
});

export default {
  file: '13_PhuThu',
  title: 'Thêm / Sửa phụ thu',
  kind: 'Dialog',
  route: 'Mở trên /phong, tab Phụ thu',
  summary: 'Thêm hoặc sửa một phụ thu. Nội dung đổi theo "Áp dụng khi" (5 trường hợp, mỗi trường hợp gắn cố định một đơn vị tính): quá giờ trả phòng (phút ân hạn), vượt số khách (đ/khách), ngày trong tuần (chọn ngày, %), khoảng ngày (các dịp, %), thêm tay vào đơn (đ/lần); chọn hạng phòng áp dụng. Xoá = ẩn (xoá mềm).',
  access: ['Phòng & bảng giá → tab Phụ thu → "Thêm" (thêm mới) hoặc bấm một phụ thu (sửa).'],
  roles: ROLES.manager,
  related: ['10_Phong', '08_TaoSuaDon (phụ thu tự động lúc tạo đơn)', '07_ChiTietDon (quá giờ, thêm tay lúc trả phòng)', '00_TongThe (bảng surcharge*)'],
  sources: [
    'frontend/src/app/pages/rooms/surcharge-dialog.{ts,html,scss}',
    'backend/.../surcharge/SurchargeController.java, SurchargeService, SurchargeUpsertRequest, SurchargeCalculator',
  ],
  history: fixVersion('Sửa chữ hướng dẫn loại "Thêm tay vào đơn" (chọn khi trả phòng); ô thiếu tô đỏ + hộp lỗi khi lưu; giới hạn độ dài tên.'),
  shots: [
    {
      id: 'add', caption: 'Thêm phụ thu (mặc định "Ngày trong tuần"), lưu khi chưa chọn ngày', viewport: VIEWPORT, fullPage: false, clip: DIALOG,
      go: async (page, ctx) => {
        await openTab(page, ctx);
        await page.click('.card:has(.fees) .ch button');
        await page.fill(`${DIALOG} #s-name`, 'Ngày thường cao điểm');
        await page.fill(`${DIALOG} #s-amount`, '5');
        await page.click(`${DIALOG} .p-dialog-footer button:has-text("Lưu phụ thu")`);
        await page.locator(`${DIALOG} .err`).waitFor();
      },
    },
    edit('overstay', 'Sửa phụ thu "Quá giờ trả phòng"', 'Quá giờ trả phòng'),
    edit('extraGuest', 'Sửa phụ thu "Vượt số khách tối đa"', 'Vượt số khách'),
    edit('dateRange', 'Sửa phụ thu "Khoảng ngày"', 'Lễ, Tết'),
    edit('manual', 'Sửa phụ thu "Thêm tay vào đơn"', 'Trang trí sinh nhật'),
  ],
  items: [
    { sel: `${DIALOG} .p-dialog-header`, label: 'Tiêu đề', kind: 'Tiêu đề dialog + nút đóng', code: "surcharge() ? 'Sửa phụ thu' : 'Thêm phụ thu'" },
    { sel: `${DIALOG} #s-name`, label: 'Tên phụ thu', kind: 'Ô nhập chữ', code: 'form.controls.name', dataType: 'string', required: 'Có', rule: 'Tối đa 100 ký tự. Là tên dòng phụ thu hiện trên đơn.' },
    {
      sel: `${DIALOG} fieldset.opts`, label: 'Áp dụng khi', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.whenType',
      dataType: 'OVERSTAY | EXTRA_GUEST | WEEKDAY | DATE_RANGE | MANUAL', required: 'Có', default: 'Ngày trong tuần (thêm mới)',
      note: 'Đổi lựa chọn → đổi các ô bên dưới (ảnh 1–5). Đơn vị tính cố định theo lựa chọn, không chọn tự do.',
    },
    {
      sel: `${DIALOG} .cbs.days`, label: 'Các ngày áp dụng', kind: 'Ô chọn (checkbox) T2–CN', code: 'weekdays (signal<Set>) · toggleWeekday()',
      dataType: 'MONDAY…SUNDAY', required: 'Có (≥ 1 ngày)', default: 'Không chọn',
      note: 'Chỉ khi "Ngày trong tuần". Tính cho từng ngày khách ở rơi vào ngày đã chọn; đơn theo giờ / qua đêm tính theo ngày nhận phòng.',
    },
    {
      sel: `${DIALOG} .money:has(#s-amount)`, label: 'Mức thu (%)', kind: 'Ô nhập số + đơn vị', code: 'form.controls.amount · amountUnit()', dataType: 'số nguyên',
      required: 'Có', rule: '> 0 (backend "Mức thu phải lớn hơn 0"). Ngày trong tuần / Khoảng ngày: % tiền phòng của ngày đó.',
    },
    {
      sel: `${DIALOG} .field:has-text("Áp dụng cho hạng phòng") .cbs`, label: 'Áp dụng cho hạng phòng', kind: 'Ô chọn (checkbox) nhiều', code: 'selectedRoomTypeIds · toggleRoomType()',
      dataType: 'danh sách id hạng', required: 'Có (≥ 1 hạng)', default: 'Thêm mới: chọn tất cả hạng đang dùng', note: 'Chỉ hạng đang dùng; hạng đã ẩn → 400.',
    },
    { sel: `${DIALOG} .p-dialog-footer`, label: 'Huỷ · Lưu phụ thu', kind: 'Nút phụ + nút chính', code: 'cancel() · save()', badge: 'right', note: 'Thêm mới: POST /surcharges; sửa: PUT /surcharges/{id}.' },
    {
      sel: `${DIALOG} .err`, label: 'Hộp báo lỗi', kind: 'Thông báo lỗi', code: 'errorMessage',
      note: 'Lỗi frontend ("Phải chọn ít nhất một ngày trong tuần." / "Phải có ít nhất một khoảng ngày." / "Phải chọn ít nhất một hạng phòng.") hoặc detail từ server.',
    },
    {
      shot: 'overstay', sel: `${DIALOG} .field:has(#s-grace)`, label: 'Phút ân hạn', kind: 'Ô nhập số (phút)', code: 'form.controls.graceMinutes', dataType: 'số nguyên',
      required: 'Không', default: '15', note: 'Chỉ khi "Quá giờ trả phòng". Không có ô mức thu: mức thu = giá "mỗi giờ thêm" của hạng phòng (snapshot của đơn). Kèm giải thích cách tính.',
    },
    {
      shot: 'overstay', sel: `${DIALOG} .link-btn.del`, label: 'Xoá phụ thu', kind: 'Nút chữ (đỏ)', code: 'hide()',
      note: 'Chỉ khi sửa. Ẩn phụ thu (PATCH /surcharges/{id}/active { active: false }), không hỏi lại; phụ thu chuyển xuống "Phụ thu đã ẩn", khôi phục được. Đơn đã có giữ nguyên dòng phụ thu.',
    },
    {
      shot: 'extraGuest', sel: `${DIALOG} .money:has(#s-amount)`, label: 'Mức thu (đ/khách)', kind: 'Ô nhập số + đơn vị', code: 'form.controls.amount', dataType: 'số nguyên (VND)',
      required: 'Có', rule: '> 0.', note: 'Tính cho mỗi khách vượt số khách tối đa của phòng (cài ở từng phòng), cộng một lần lúc tạo/sửa đơn.',
    },
    {
      shot: 'dateRange', sel: `${DIALOG} .ranges .rg >> nth=0`, label: 'Một khoảng ngày', kind: 'Ô chữ + 2 ô ngày + nút xoá', code: 'dateRanges[i] (FormArray): name, fromDate, toDate',
      dataType: 'string, date, date', required: 'Có (cả 3 ô)', rule: 'Đến ngày ≥ từ ngày (backend: "Đến ngày phải sau hoặc bằng từ ngày: {tên dịp}"). Tính cả 2 ngày đầu cuối.',
      note: 'Thùng rác: xoá dòng khỏi form (lưu mới áp dụng; luôn thay toàn bộ danh sách).',
    },
    { shot: 'dateRange', sel: `${DIALOG} .link-btn:has-text("Thêm khoảng ngày")`, label: 'Thêm khoảng ngày', kind: 'Nút chữ', code: 'addDateRange()' },
    {
      shot: 'dateRange', sel: `${DIALOG} .field:has(.ranges) .hint`, label: 'Quy tắc khoảng ngày', kind: 'Chữ (tĩnh)', code: '.hint',
      note: 'Một ngày thoả cả "Ngày trong tuần" và "Khoảng ngày" thì chỉ lấy mức cao hơn.',
    },
    {
      shot: 'manual', sel: `${DIALOG} .money:has(#s-amount)`, label: 'Mức thu (đ/lần)', kind: 'Ô nhập số + đơn vị', code: 'form.controls.amount', dataType: 'số nguyên (VND)',
      required: 'Có', rule: '> 0.',
      note: 'Không tự cộng. Chữ hướng dẫn: "Khi trả phòng, nhân viên đánh dấu phụ thu này ở mục "Thêm phụ thu" để cộng vào." (form Trả phòng — file 07).',
    },
  ],
  logic: [
    { title: 'LOGIC DIALOG PHỤ THU' },
    { h: '1. Mở dialog' },
    {
      list: [
        'Thêm: tên trống, Ngày trong tuần, chưa chọn ngày, chọn sẵn mọi hạng đang dùng, phút ân hạn 15.',
        'Sửa: điền từ phụ thu đang chọn (tên, loại, mức thu, phút ân hạn, ngày, khoảng ngày, hạng áp dụng).',
      ],
    },
    { h: '2. Năm trường hợp "Áp dụng khi"' },
    {
      table: {
        cols: [{ h: 'Áp dụng khi', w: 5 }, { h: 'Ô nhập', w: 7 }, { h: 'Đơn vị', w: 4 }, { h: 'Cách tính (SurchargeCalculator)', w: 16 }],
        rows: [
          ['Quá giờ trả phòng (OVERSTAY)', 'Phút ân hạn', 'Giá mỗi giờ thêm', 'Lúc trả phòng: trễ ≤ ân hạn → 0; quá ân hạn → số giờ trễ tính từ giờ hẹn trả (không trừ ân hạn), làm tròn lên × giá mỗi giờ thêm. Tối đa 1 phụ thu loại này đang dùng.'],
          ['Vượt số khách tối đa (EXTRA_GUEST)', 'Mức thu', 'đ/khách vượt', 'Lúc tạo/sửa đơn: (số khách − số khách tối đa của phòng) × mức. Tối đa 1 phụ thu loại này đang dùng.'],
          ['Ngày trong tuần (WEEKDAY)', 'Các ngày + mức thu', '% tiền phòng', 'Lúc tạo/sửa đơn: mỗi ngày ở khớp ngày đã chọn → % × giá của ngày đó.'],
          ['Khoảng ngày (DATE_RANGE)', 'Các dịp (tên, từ, đến) + mức thu', '% tiền phòng', 'Như ngày trong tuần, cho ngày nằm trong khoảng. Cùng ngày khớp nhiều phụ thu theo ngày → lấy mức cao nhất (không cộng dồn).'],
          ['Thêm tay vào đơn (MANUAL)', 'Mức thu', 'đ/lần', 'Không tự cộng; chọn ở form trả phòng.'],
        ],
      },
    },
    {
      note: 'Quá giờ, vượt khách, thêm tay luôn cộng dồn với nhau và với phụ thu theo ngày. Phụ thu đã áp vào đơn được lưu snapshot (tên + số tiền) — sửa/ẩn phụ thu sau đó không đổi đơn cũ. Ví dụ: Tết 05–10/02, thuê theo ngày 03→07/02 → chỉ ngày 05, 06 bị tính.',
    },
    { h: '3. Lưu, ẩn' },
    {
      list: [
        'Frontend kiểm tra: tên bắt buộc, khoảng ngày đủ 3 ô → tô đỏ ô, hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ)."; ≥ 1 ngày (Ngày trong tuần), ≥ 1 khoảng (Khoảng ngày), ≥ 1 hạng → hộp lỗi. Tên phụ thu, tên dịp tối đa 100 ký tự (maxlength).',
        'Gửi { name, whenType, amount (null với Quá giờ), graceMinutes (chỉ Quá giờ, mặc định 15), weekdays, dateRanges, roomTypeIds }. Backend xoá các trường không thuộc loại đang chọn.',
        'Backend: mức thu ≤ 0 → 400; hạng đã ẩn → 400; đã có phụ thu Quá giờ / Vượt khách khác đang dùng → 409.',
        'Xoá phụ thu = ẩn (active = 0), không xoá cứng; khôi phục ở tab Phụ thu. Không ghi nhật ký thao tác (cấu hình).',
      ],
    },
    { h: '4. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 12 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Chưa chọn ngày trong tuần', '400 / frontend', 'Phải chọn ít nhất một ngày trong tuần'],
          ['Không có khoảng ngày', '400 / frontend', 'Phải có ít nhất một khoảng ngày'],
          ['Đến ngày < từ ngày', 400, 'Đến ngày phải sau hoặc bằng từ ngày: {tên dịp}'],
          ['Mức thu trống hoặc ≤ 0', 400, 'Mức thu phải lớn hơn 0'],
          ['Không chọn hạng phòng', '400 / frontend', 'Phải chọn ít nhất một hạng phòng'],
          ['Hạng phòng đã ẩn', 400, 'Hạng phòng đã ẩn, không áp dụng được: {tên}'],
          ['Trùng phụ thu Quá giờ / Vượt khách đang dùng', 409, 'Đã có phụ thu đang hoạt động cho điều kiện này'],
          ['Phụ thu không tồn tại', 404, 'Phụ thu không tồn tại'],
          ['Thiếu tên / ô khoảng ngày', 'frontend', 'Vui lòng nhập đủ các ô bắt buộc (viền đỏ).'],
          ['Tên quá 100 ký tự (gọi thẳng API)', 400, 'Dữ liệu không hợp lệ — errors.name / errors["dateRanges[i].name"]: "Tối đa 100 ký tự"'],
          ['Lỗi khác', '—', 'Không lưu được phụ thu, thử lại sau. / Không ẩn được phụ thu, thử lại sau.'],
        ],
      },
    },
  ],
};
