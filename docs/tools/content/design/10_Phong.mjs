// Nội dung file 10_Phong.xlsx: màn Phòng & bảng giá (tab Phòng, Bảng giá, Phụ thu).
import { ROLES, fixVersion } from '../common.mjs';

const CARD = '.rc:has-text("201 · ")';

/**
 * Mở màn Phòng, chọn tab nếu cần.
 * @param {string} [tab] nhãn tab: "Bảng giá" | "Phụ thu"
 */
const open = (tab) => async (page, ctx) => {
  await ctx.open(page, '/phong');
  await page.locator('.rc').first().waitFor();
  if (tab) {
    await page.click(`.tabs button:has-text("${tab}")`);
    await page.waitForLoadState('networkidle');
  }
};

export default {
  file: '10_Phong',
  title: 'Phòng & bảng giá',
  kind: 'Màn hình (3 tab)',
  route: '/phong',
  summary: 'Tab Phòng: thẻ từng phòng (ảnh bìa, hạng, giá áp dụng, hình thức check-in, Chờ dọn → Đã dọn, bật/tắt nhận đặt). Tab Bảng giá: giá theo hạng phòng và khung giờ chung. Tab Phụ thu: danh sách phụ thu đang dùng và đã ẩn. Nhân viên chỉ xem (và bấm Đã dọn).',
  access: ['Menu trái → Phòng & bảng giá.'],
  roles: `${ROLES.all}. Chỉ Quản lý: Thêm phòng, Sửa, bật/tắt nhận đặt, Sửa bảng giá, Thêm/Sửa/Khôi phục phụ thu. Mọi vai trò: Đã dọn.`,
  related: ['11_ThemSuaPhong', '12_BangGia', '13_PhuThu', '04_TongQuan (trạng thái phòng)', '00_TongThe (bảng room, room_type, surcharge)'],
  sources: [
    'frontend/src/app/pages/rooms/rooms-page.{ts,html,scss}',
    'frontend/src/app/core/room.service.ts, surcharge.service.ts',
    'backend/.../room/RoomController.java, PricingController.java (GET /room-types/overview), surcharge/SurchargeController.java',
  ],
  history: fixVersion('Thẻ phòng: nhãn giá "{N} giờ đầu" đổi theo số giờ tối thiểu (trước đây cố định "2 giờ đầu").'),
  shots: [
    { id: 'rooms', caption: 'Tab Phòng (Quản lý)', go: open() },
    { id: 'pricing', caption: 'Tab Bảng giá', fullPage: false, go: open('Bảng giá') },
    { id: 'surcharges', caption: 'Tab Phụ thu', fullPage: false, go: open('Phụ thu') },
    { id: 'staff', caption: 'Tab Phòng (Nhân viên): chỉ xem', role: 'staff', fullPage: false, go: open() },
  ],
  items: [
    { sel: '.ph .page-desc', label: 'Dòng tóm tắt', kind: 'Chữ', code: 'rooms().length · roomTypeCount()', note: '"{n} phòng · {m} hạng phòng · giá áp dụng cho đơn tạo mới" (m = hạng đang dùng).' },
    { sel: '.ph a[pButton]', label: 'Thêm phòng', kind: 'Nút chính (link)', code: 'routerLink="/phong/them"', badge: 'right', note: 'Chỉ Quản lý. Mở màn Thêm phòng (file 11).' },
    { sel: 'nav.tabs', label: 'Tab Phòng / Bảng giá / Phụ thu', kind: 'Nhóm tab', code: "tab (signal): 'phong' | 'bang-gia' | 'phu-thu'", default: 'Phòng', note: 'Đổi tab không đổi URL (mở lại màn về tab Phòng).' },
    {
      sel: `${CARD} .photo`, label: 'Ảnh bìa', kind: 'Ảnh', code: 'coverPhoto(room)',
      note: 'Ảnh đầu tiên của phòng (GET /room-photos/{id}, cần đăng nhập). Chưa có ảnh: icon + "Chưa có ảnh".',
    },
    {
      sel: `${CARD} .rc-h`, label: 'Số · tên phòng, hạng, tầng, sức chứa', kind: 'Chữ', code: 'roomNumber · name · roomTypeName · floor · maxGuests',
      note: '"{số} · {tên}"; dòng dưới "{hạng}[ · tầng {n}] · {n} khách". Tag "Chờ dọn" khi phòng cần dọn.',
    },
    { sel: `${CARD} .mode`, label: 'Hình thức check-in mặc định', kind: 'Chữ + icon', code: 'checkInLabel(room)', note: '"Mặc định: khách tự check-in" (icon chìa khoá) / "Mặc định: nhân viên check-in" (icon người).' },
    {
      sel: `${CARD} .prices`, label: 'Giá áp dụng', kind: 'Chữ (tiền)', code: 'effectiveTwoHourPrice, effectiveExtraHourPrice, effectiveOvernightPrice, effectiveDailyPrice',
      dataType: 'tiền', note: 'Giá thật áp dụng (theo hạng hoặc giá riêng của phòng): "{số giờ tối thiểu} giờ đầu" + "+{giá}/giờ", "Qua đêm", "Theo ngày". Nhãn giờ đầu đổi theo số giờ tối thiểu của bảng giá (minHours()).',
    },
    {
      sel: `${CARD} .rc-f .btn-t:has-text("Đã dọn")`, label: 'Đã dọn', kind: 'Nút chữ', code: 'markCleaned(room)',
      note: 'Chỉ hiện khi phòng Chờ dọn; mọi vai trò. POST /rooms/{id}/cleaned → phòng về Trống, nhật ký ROOM_CLEANED "Đã dọn phòng".',
    },
    {
      sel: `${CARD} .sw`, label: 'Nhận đặt phòng', kind: 'Công tắc (switch)', code: 'toggleAccepting(room)', dataType: 'boolean',
      note: 'Bật/tắt ngay (PATCH /rooms/{id}/accepting-bookings). Tắt: không tạo đơn mới cho phòng, không bấm được ô trống trên Lịch, không là phòng chuyển khi gia hạn; đơn đã có giữ nguyên. Nhân viên: chỉ xem (mờ, không bấm được).',
    },
    { sel: `${CARD} .rc-f a.btn-t`, label: 'Sửa', kind: 'Link', code: "routerLink=['/phong', id, 'sua']", badge: 'right', note: 'Chỉ Quản lý. Mở màn Sửa phòng (file 11).' },

    {
      shot: 'pricing', sel: '.price-row .ch', label: 'Bảng giá theo hạng phòng · Sửa bảng giá', kind: 'Tiêu đề card + nút chữ', code: 'pricingDialogVisible',
      note: 'Nút "Sửa bảng giá" chỉ Quản lý, mở dialog (file 12).',
    },
    {
      shot: 'pricing', sel: '.price-row thead', label: 'Tiêu đề bảng giá', kind: 'Bảng', code: 'settings.minHours, overnightCheckIn/Out, dailyCheckIn/Out',
      note: '"{số giờ tối thiểu} giờ đầu" · Mỗi giờ thêm · "Qua đêm HH:mm → HH:mm" · "Theo ngày HH:mm → HH:mm".',
    },
    {
      shot: 'pricing', sel: '.price-row tbody tr >> nth=0', label: 'Một hạng phòng', kind: 'Dòng bảng', code: 'roomTypes[i]',
      note: 'Tên hạng + các số phòng đang dùng hạng (phòng giá riêng vẫn liệt kê); 4 mức giá. Chỉ hạng đang dùng (hạng đã ẩn xem trong dialog).',
    },
    { shot: 'pricing', sel: '.price-row .foot-note', label: 'Ghi chú', kind: 'Chữ (tĩnh)', code: '.foot-note', note: '"Đổi giá chỉ áp dụng cho đơn tạo sau thời điểm lưu. Đơn đã có giữ nguyên giá lúc đặt."' },

    { shot: 'surcharges', sel: '.card:has(.fees) .ch', label: 'Phụ thu · Thêm', kind: 'Tiêu đề card + nút chữ', code: 'openAddSurcharge()', note: 'Nút "Thêm" chỉ Quản lý, mở dialog Thêm phụ thu (file 13).' },
    {
      shot: 'surcharges', sel: '.fee >> nth=0', label: 'Một phụ thu', kind: 'Dòng (bấm được với Quản lý)', code: 'openEditSurcharge(s) · whenDescription() · amountLabel()',
      note: 'Tên + mô tả điều kiện: Quá giờ "Sau {n} phút ân hạn · làm tròn lên theo giờ" / Vượt khách "Vượt số khách tối đa của phòng" / Ngày trong tuần "T7, CN" / Khoảng ngày tên các dịp / Thêm tay tên các hạng áp dụng. Bên phải: "Giá mỗi giờ thêm" / "{tiền}/khách" / "+{n}%" / "{tiền}/lần". Quản lý bấm để sửa.',
    },
    {
      shot: 'surcharges', sel: '.hidden-block', label: 'Phụ thu đã ẩn · Khôi phục', kind: 'Danh sách + nút chữ', code: 'hiddenSurcharges() · restoreSurcharge(s)',
      note: 'Chỉ Quản lý, khi có phụ thu đã ẩn. Khôi phục → PATCH /surcharges/{id}/active { active: true }; lỗi (vd đã có phụ thu Quá giờ đang dùng) hiện hộp đỏ phía trên.',
    },
    { shot: 'staff', sel: '.ph', label: 'Tiêu đề (Nhân viên)', kind: 'Chữ', code: 'isManager() = false', note: 'Không có nút Thêm phòng.' },
    { shot: 'staff', sel: '.rc >> nth=0 >> .rc-f', label: 'Chân thẻ phòng (Nhân viên)', kind: 'Công tắc chỉ đọc', code: '.sw.readonly', note: 'Công tắc Nhận đặt phòng bị khoá; không có link Sửa. Vẫn có nút Đã dọn khi phòng Chờ dọn.' },
  ],
  logic: [
    { title: 'LOGIC MÀN PHÒNG & BẢNG GIÁ' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'Song song: GET /api/rooms (phòng, sắp theo số phòng, kèm giá áp dụng effective*, ảnh, needsCleaning), GET /api/room-types/overview (hạng đang dùng, hạng đã ẩn, khung giờ chung), GET /api/surcharges (mọi phụ thu kể cả đã ẩn).',
        'Sau khi dialog Bảng giá lưu: tải lại cả 3; sau khi dialog Phụ thu lưu / ẩn: tải lại danh sách phụ thu.',
      ],
    },
    { h: '2. Hành động' },
    {
      table: {
        cols: [{ h: 'Thao tác', w: 6 }, { h: 'Quyền', w: 4 }, { h: 'API', w: 8 }, { h: 'Kết quả', w: 14 }],
        rows: [
          ['Đã dọn', 'Mọi vai trò', 'POST /rooms/{id}/cleaned', 'needsCleaning = false (phòng Trống); cập nhật thẻ. Nhật ký ROOM_CLEANED.'],
          ['Bật/tắt Nhận đặt phòng', 'Chỉ Quản lý', 'PATCH /rooms/{id}/accepting-bookings { acceptingBookings }', 'Cập nhật thẻ. Không ghi nhật ký (cấu hình).'],
          ['Thêm phòng / Sửa', 'Chỉ Quản lý', '— (chuyển màn)', '/phong/them, /phong/{id}/sua (file 11); Nhân viên vào thẳng URL bị managerGuard đưa về /phong.'],
          ['Sửa bảng giá', 'Chỉ Quản lý', '— (mở dialog)', 'File 12.'],
          ['Thêm / bấm một phụ thu', 'Chỉ Quản lý', '— (mở dialog)', 'File 13.'],
          ['Khôi phục phụ thu', 'Chỉ Quản lý', 'PATCH /surcharges/{id}/active', 'Phụ thu dùng lại; OVERSTAY / EXTRA_GUEST đã có bản đang dùng → 409 "Đã có phụ thu đang hoạt động cho điều kiện này".'],
        ],
      },
    },
    {
      note: 'Phòng không xoá được (kể cả xoá mềm) vì đơn luôn trỏ tới phòng — chỉ tắt Nhận đặt phòng. Các thay đổi cấu hình ở màn này không ghi nhật ký thao tác (vẫn có created/updated by).',
    },
  ],
};
