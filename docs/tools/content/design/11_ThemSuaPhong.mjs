// Nội dung file 11_ThemSuaPhong.xlsx: màn Thêm / Sửa phòng.
import { FIRST_VERSION, ROLES } from '../common.mjs';

const PRICE_CARD = '.card:has(h2:has-text("Giá thuê"))';
const MODE_CARD = '.card:has(h2:has-text("Nhận"))';

/** Điền phần thông tin phòng mẫu. */
const fillInfo = async (page, roomNumber) => {
  await page.fill('#no', roomNumber);
  await page.fill('#nm', 'Phòng Hoa Lan');
  await page.fill('#fl', '1');
  await page.selectOption('#cls', { label: 'Tiêu chuẩn' });
  await page.fill('#bed', '1 giường đôi');
};

export default {
  file: '11_ThemSuaPhong',
  title: 'Thêm / Sửa phòng',
  kind: 'Màn hình',
  route: '/phong/them · /phong/{id}/sua',
  summary: 'Thêm phòng mới hoặc sửa phòng: thông tin, ảnh (ảnh đầu là ảnh bìa), cách tính giá (theo hạng phòng hoặc giá riêng 4 mức), hình thức nhận phòng mặc định, hướng dẫn tự nhận phòng (chèn vào tin nhắn), bật/tắt nhận đặt.',
  access: ['Phòng & bảng giá → "Thêm phòng" (thêm).', 'Phòng & bảng giá → thẻ phòng → "Sửa" (sửa).'],
  roles: `${ROLES.manager} (managerGuard; Nhân viên vào thẳng URL bị đưa về /phong, API trả 403).`,
  related: ['10_Phong', '12_BangGia (giá theo hạng)', '07_ChiTietDon (biến {huong_dan})', '00_TongThe (bảng room, room_photo)'],
  sources: [
    'frontend/src/app/pages/rooms/room-form-page.{ts,html,scss}',
    'frontend/src/app/core/room.service.ts',
    'backend/.../room/RoomController.java (POST/PUT /rooms, POST/DELETE /rooms/{id}/photos), RoomService, RoomPhotoStorageService, RoomUpsertRequest',
  ],
  history: FIRST_VERSION,
  shots: [
    {
      id: 'add',
      caption: 'Thêm phòng (đã chọn 2 ảnh, chưa lưu)',
      go: async (page, ctx) => {
        await ctx.open(page, '/phong/them');
        await fillInfo(page, '105');
        await page.fill('#desc', 'Phòng nhỏ yên tĩnh, cửa sổ nhìn ra vườn.');
        await page.fill('#guide', 'Cửa chính mở bằng mã cửa trong tin nhắn. Phòng ở cuối hành lang tầng 1.');
        await page.setInputFiles('.drop input[type=file]', [
          { name: 'lan-1.png', mimeType: 'image/png', buffer: await ctx.photo('Phòng 105 · ảnh 1', 140) },
          { name: 'lan-2.png', mimeType: 'image/png', buffer: await ctx.photo('Phòng 105 · ảnh 2', 260) },
        ]);
      },
    },
    {
      id: 'edit',
      caption: 'Sửa phòng có ảnh, giá theo hạng',
      fullPage: false,
      go: async (page, ctx) => {
        await ctx.open(page, `/phong/${ctx.room['101']}/sua`);
        await page.locator('.thumb img').first().waitFor();
      },
    },
    {
      id: 'own',
      caption: 'Phòng đặt giá riêng (Cách tính giá = Giá riêng)',
      clip: PRICE_CARD,
      go: async (page, ctx) => {
        await ctx.open(page, `/phong/${ctx.room['302']}/sua`);
        await page.locator('#p1').waitFor();
      },
    },
    {
      id: 'error',
      caption: 'Lưu bị từ chối: số phòng đã tồn tại',
      fullPage: false,
      go: async (page, ctx) => {
        await ctx.open(page, '/phong/them');
        await fillInfo(page, '101');
        await page.click('.sum-a .btn-p');
        await page.locator('.form-col > .err').waitFor();
      },
    },
  ],
  items: [
    { sel: '.ph', label: 'Đường dẫn + tiêu đề', kind: 'Chữ', code: 'isEdit()', note: '"Phòng & bảng giá › Thêm phòng / Sửa phòng".' },
    { sel: '#no', label: 'Số phòng', kind: 'Ô nhập chữ', code: 'form.controls.roomNumber', dataType: 'string', required: 'Có', rule: 'Không trùng phòng khác, so không phân biệt hoa thường (409). Tối đa 20 ký tự (cột DB).' },
    { sel: '#nm', label: 'Tên phòng', kind: 'Ô nhập chữ', code: 'form.controls.name', dataType: 'string', required: 'Có', rule: 'Tối đa 100 ký tự (cột DB).' },
    { sel: '#fl', label: 'Tầng', kind: 'Ô nhập số', code: 'form.controls.floor', dataType: 'số nguyên', required: 'Không', default: '(trống)' },
    {
      sel: '#cls', label: 'Hạng phòng', kind: 'Ô chọn', code: 'form.controls.roomTypeId', dataType: 'id hạng phòng', required: 'Có',
      rule: 'Chỉ hạng đang dùng; hạng đã ẩn → 400.', default: '"— Chọn hạng —"',
    },
    { sel: '#cap', label: 'Số khách tối đa', kind: 'Ô nhập số', code: 'form.controls.maxGuests', dataType: 'số nguyên', required: 'Có', rule: '≥ 1. Đơn có số khách lớn hơn bị phụ thu "Vượt số khách".', default: '2' },
    { sel: '#bed', label: 'Giường', kind: 'Ô nhập chữ', code: 'form.controls.bedConfig', dataType: 'string', required: 'Không', rule: 'Tối đa 100 ký tự.', default: 'Placeholder "VD: 1 giường đôi"' },
    { sel: '#desc', label: 'Mô tả ngắn', kind: 'Ô nhập nhiều dòng', code: 'form.controls.description', dataType: 'string', required: 'Không', rule: 'Tối đa 500 ký tự.' },
    {
      sel: '.drop', label: 'Chọn ảnh', kind: 'Vùng chọn file (nhiều ảnh)', code: 'onFilesSelected()', dataType: 'file',
      rule: 'JPG, PNG, WebP (backend kiểm tra theo nội dung file thật); ≤ 5 MB/ảnh, ≤ 25 MB/lần tải.',
      note: 'Thêm phòng: ảnh chờ, xem trước ngay, tải lên sau khi lưu phòng. Sửa phòng: tải lên ngay khi chọn (POST /rooms/{id}/photos).',
    },
    {
      sel: '.thumb >> nth=0', label: 'Ảnh (ảnh bìa)', kind: 'Ảnh + tag + nút xoá', code: 'existingPhotos / pendingPhotos',
      note: 'Ảnh đầu tiên có tag "Ảnh bìa" (hiện ở thẻ phòng). Nút X: ảnh chờ → bỏ khỏi danh sách; ảnh đã lưu → xoá ngay (DELETE /rooms/{id}/photos/{photoId}, xoá cả file).',
    },
    {
      sel: `${PRICE_CARD} fieldset`, label: 'Cách tính giá', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.pricingMode', dataType: 'ROOM_TYPE | OWN', required: 'Có',
      default: 'Theo bảng giá hạng', note: '"Theo bảng giá hạng {tên}" — đổi giá hạng thì phòng đổi theo; "Giá riêng cho phòng này" — tự nhập 4 mức (ảnh 3).',
    },
    { sel: `${PRICE_CARD} .prices4`, label: 'Giá của hạng đang chọn', kind: 'Chữ (tiền)', code: 'selectedRoomType()', note: 'Chỉ đọc: 2 giờ đầu, Mỗi giờ thêm, Qua đêm, Theo ngày của hạng.' },
    {
      sel: `${MODE_CARD} fieldset`, label: 'Hình thức mặc định cho đơn của phòng này', kind: 'Nhóm nút chọn (radio)', code: 'form.controls.defaultCheckInMode',
      dataType: 'SELF | STAFF', required: 'Có', default: 'Khách tự check-in / check-out', note: 'Là giá trị chọn sẵn khi tạo đơn cho phòng (sửa được từng đơn).',
    },
    {
      sel: '#guide', label: 'Hướng dẫn tự nhận phòng', kind: 'Ô nhập nhiều dòng', code: 'form.controls.checkInGuide', dataType: 'string', required: 'Không',
      rule: 'Tối đa 1000 ký tự.', note: 'Chèn vào tin nhắn qua biến {huong_dan} (lấy bản hiện hành lúc sao chép).',
    },
    { sel: `${MODE_CARD} .sw`, label: 'Nhận đặt phòng', kind: 'Ô chọn (checkbox)', code: 'form.controls.acceptingBookings', dataType: 'boolean', default: 'Bật' },
    {
      sel: '.sum-a .btn-p', label: 'Lưu phòng', kind: 'Nút chính', code: 'submit()',
      note: 'Đang lưu: "Đang lưu...". Thêm: POST /rooms rồi tải ảnh chờ; sửa: PUT /rooms/{id}. Xong về /phong.',
    },
    { sel: '.sum-a .btn-t', label: 'Huỷ', kind: 'Link', code: 'routerLink="/phong"', note: 'Không lưu (ảnh đã tải lên khi sửa vẫn giữ).' },
    { shot: 'edit', sel: '.ph h1', label: 'Tiêu đề Sửa phòng', kind: 'Chữ', code: "isEdit() ? 'Sửa phòng'", note: 'Form điền sẵn dữ liệu phòng (GET /rooms/{id}).' },
    {
      shot: 'own', sel: `${PRICE_CARD} .g2`, label: 'Giá riêng 4 mức', kind: 'Ô nhập số × 4', code: 'ownTwoHourPrice, ownExtraHourPrice, ownOvernightPrice, ownDailyPrice',
      dataType: 'số nguyên (VND)', required: 'Có (khi Giá riêng)', rule: 'Phải nhập đủ 4 mức ("Phải nhập đủ 4 mức giá khi chọn giá riêng cho phòng.").',
    },
    { shot: 'error', sel: '.form-col > .err', label: 'Hộp báo lỗi', kind: 'Thông báo lỗi', code: 'errorMessage', note: 'Lỗi frontend hoặc detail lỗi từ server (sheet 4).' },
  ],
  logic: [
    { title: 'LOGIC MÀN THÊM / SỬA PHÒNG' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'GET /api/room-types/overview → danh sách hạng đang dùng cho ô Hạng phòng và khối giá theo hạng.',
        'Sửa: GET /api/rooms/{id} → điền form, ảnh đã lưu. Thêm: form mặc định (2 khách, giá theo hạng, khách tự check-in, nhận đặt).',
      ],
    },
    { h: '2. Lưu phòng' },
    {
      list: [
        'Frontend: form thiếu ô bắt buộc (Số phòng, Tên, Hạng, Số khách ≥ 1) → không gửi (không tô đỏ ô). Giá riêng thiếu mức nào → hộp lỗi.',
        'Thêm: POST /api/rooms; thành công thì nếu có ảnh chờ → POST /api/rooms/{id}/photos (multipart "files"), rồi về /phong.',
        'Sửa: PUT /api/rooms/{id} → về /phong. Ảnh thêm/xoá đã lưu ngay khi thao tác.',
        'Backend: số phòng trùng → 409; hạng không tồn tại → 404, hạng đã ẩn → 400; giá riêng thiếu mức → 400. Giá theo hạng thì các cột own_* vẫn lưu nhưng không dùng.',
        'Ảnh: kiểm tra byte đầu file là JPG/PNG/WebP, lưu file tên UUID + đuôi theo loại thật vào thư mục app.storage.room-photos-dir, DB lưu tên file + thứ tự (ảnh mới thêm vào cuối).',
        'Không ghi nhật ký thao tác (cấu hình); created/updated by được ghi tự động.',
      ],
    },
    { h: '3. Thông báo lỗi' },
    {
      table: {
        cols: [{ h: 'Trường hợp', w: 12 }, { h: 'HTTP', w: 2 }, { h: 'Thông báo', w: 18 }],
        rows: [
          ['Số phòng trùng', 409, 'Số phòng đã tồn tại'],
          ['Giá riêng thiếu mức', '400 / frontend', 'Phải nhập đủ 4 mức giá khi chọn giá riêng cho phòng'],
          ['Hạng phòng đã ẩn', 400, 'Hạng phòng đã ẩn, không gán được cho phòng'],
          ['Hạng phòng không tồn tại', 404, 'Hạng phòng không tồn tại'],
          ['File không phải JPG/PNG/WebP', 400, 'Chỉ nhận file ảnh JPG, PNG hoặc WebP'],
          ['Nhân viên gọi API', 403, 'Không có quyền thực hiện'],
          ['Lỗi khác', '—', 'Không lưu được phòng, thử lại sau.'],
        ],
      },
    },
    { note: 'Lưu ý: frontend không giới hạn độ dài các ô chữ; nhập quá độ dài cột DB sẽ lỗi hệ thống (500).' },
  ],
};
