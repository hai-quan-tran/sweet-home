// Nội dung file 17_CaiDat.xlsx: màn Cài đặt (mẫu tin nhắn, thông tin homestay).
import { ROLES, fixVersion } from '../common.mjs';

const EDITOR = '.tpl > section.card:nth-of-type(2)';

/** Mở màn Cài đặt (tab Mẫu tin nhắn), chờ mẫu đầu tiên được chọn. */
const open = async (page, ctx) => {
  await ctx.open(page, '/cai-dat');
  await page.locator('.tpls li.on').waitFor();
};

export default {
  file: '17_CaiDat',
  title: 'Cài đặt',
  kind: 'Màn hình (2 tab)',
  route: '/cai-dat',
  summary: 'Tab Mẫu tin nhắn: danh sách mẫu, thêm/sửa/xoá mẫu, chọn mẫu tự chọn sẵn cho từng hình thức check-in, chèn biến vào nội dung, xem trước với đơn mẫu (che mã cửa). Tab Thông tin homestay: tên, hotline, địa chỉ, link bản đồ, wifi — dùng cho biến trong tin nhắn. Nhân viên chỉ xem.',
  access: ['Menu trái → Cài đặt.'],
  roles: `${ROLES.all}. Chỉ Quản lý sửa (Nhân viên: mọi ô bị khoá, không có nút).`,
  related: ['07_ChiTietDon (sao chép tin nhắn, danh sách biến)', '08_TaoSuaDon (Lưu & sao chép tin nhắn)', '00_TongThe (bảng message_template, homestay_info)'],
  sources: [
    'frontend/src/app/pages/settings/settings-page.{ts,html,scss}',
    'frontend/src/app/core/settings.service.ts, message-template.ts',
    'backend/.../settings/MessageTemplateController.java, MessageTemplateService, HomestayController.java, HomestayService',
  ],
  history: fixVersion('Thêm khung "Xem trước với đơn mẫu" (che mã cửa); ô thiếu viền đỏ + hộp lỗi khi lưu; giới hạn độ dài ô chữ.'),
  shots: [
    { id: 'templates', caption: 'Tab Mẫu tin nhắn (Quản lý)', go: open },
    {
      id: 'homestay',
      caption: 'Tab Thông tin homestay',
      fullPage: false,
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.click('.tabs button:has-text("Thông tin homestay")');
        await page.locator('#hname').waitFor();
      },
    },
    { id: 'staff', caption: 'Cài đặt (Nhân viên): chỉ xem', role: 'staff', fullPage: false, go: open },
  ],
  items: [
    { sel: 'nav.tabs', label: 'Tab Mẫu tin nhắn / Thông tin homestay', kind: 'Nhóm tab', code: "tab: 'mau-tin-nhan' | 'thong-tin'", default: 'Mẫu tin nhắn' },
    { sel: '.tpl .card >> nth=0 >> .ch', label: 'Mẫu tin nhắn · Thêm mẫu', kind: 'Tiêu đề card + nút chữ', code: 'newTemplate()', note: '"Thêm mẫu" chỉ Quản lý: xoá trắng form bên phải để nhập mẫu mới.' },
    {
      sel: '.tpls li.on', label: 'Một mẫu (đang chọn)', kind: 'Dòng (link)', code: 'selectTemplate(t)',
      note: 'Tên mẫu; "Tự chọn sẵn: Khách tự check-in / Nhân viên check-in" hoặc "Chọn tay"; tag "Có mã cửa" nếu nội dung có {ma_cua}. Sắp theo tên. Vào màn chọn sẵn mẫu đầu tiên.',
    },
    { sel: '.tpl .card >> nth=0 >> .note', label: 'Ghi chú mẫu mặc định', kind: 'Chữ (tĩnh)', code: '.note', note: 'Mỗi hình thức check-in có một mẫu tự chọn sẵn; vẫn đổi được mẫu khác trước khi sao chép.' },
    { sel: '#tname', label: 'Tên mẫu', kind: 'Ô nhập chữ', code: 'templateForm.name', dataType: 'string', required: 'Có', rule: 'Tối đa 100 ký tự (cột DB).' },
    {
      sel: `${EDITOR} fieldset.opts`, label: 'Tự chọn sẵn cho đơn', kind: 'Nhóm nút chọn (radio)', code: 'templateForm.defaultForCheckInMode', dataType: 'SELF | STAFF | null',
      required: 'Có', default: 'Không, chọn tay (mẫu mới)', note: 'Chọn một hình thức đã có mẫu mặc định khác → mẫu kia tự bỏ mặc định khi lưu (mỗi hình thức tối đa 1 mẫu).',
    },
    {
      sel: '#body', label: 'Nội dung', kind: 'Ô nhập nhiều dòng', code: 'templateForm.body', dataType: 'string', required: 'Có',
      rule: 'Tối đa 2000 ký tự (cột DB). Biến dạng {ten_bien}; biến không có trong danh sách giữ nguyên khi sao chép.',
    },
    {
      sel: '.vars', label: 'Chèn thông tin (biến)', kind: 'Nhóm nút', code: 'VARIABLES · insertVariable(key)',
      note: 'Bấm để chèn {biến} vào vị trí con trỏ trong Nội dung. Nút "Mã cửa" tô màu cảnh báo (nhạy cảm): mẫu có mã cửa, mỗi lần sao chép được ghi nhật ký. Danh sách biến: xem sheet 4.',
    },
    {
      sel: `${EDITOR} .preview`, label: 'Xem trước với đơn mẫu SH-1036', kind: 'Khung chữ (chỉ đọc)', code: 'previewParts() · buildSampleMessageContext()',
      note: 'Nội dung đang gõ ghép với một đơn mẫu cố định (Phạm Quốc Bảo, phòng 101 · Mộc, qua đêm…) + thông tin homestay đã lưu; cập nhật ngay khi gõ, giữ xuống dòng. {ma_cua} hiện "●●●●●● (hiện khi sao chép)" màu nhạt. Ẩn khi nội dung trống. Không gọi API đơn, không ghi nhật ký; Nhân viên cũng thấy.',
    },
    {
      sel: `${EDITOR} .cf`, label: 'Xoá mẫu · Huỷ · Lưu mẫu', kind: 'Nhóm nút', code: 'deleteTemplate() · newTemplate() · saveTemplate()',
      note: 'Chỉ Quản lý. "Xoá mẫu" (khi đang sửa mẫu có sẵn) xoá ngay, không hỏi lại — xoá cứng, đơn không bị ảnh hưởng. "Huỷ" xoá trắng form. Lưu: thêm (POST) hoặc sửa (PUT), xong chọn lại mẫu vừa lưu.',
    },
    { shot: 'homestay', sel: '#hname', label: 'Tên homestay', kind: 'Ô nhập chữ', code: 'homestayForm.name', dataType: 'string', required: 'Có', rule: 'Tối đa 100 ký tự.', note: 'Biến {ten_homestay}.' },
    { shot: 'homestay', sel: '#hotline', label: 'Hotline', kind: 'Ô nhập chữ', code: 'homestayForm.hotline', dataType: 'string', required: 'Có', rule: 'Tối đa 30 ký tự.', note: 'Biến {hotline}.' },
    { shot: 'homestay', sel: '#addr', label: 'Địa chỉ', kind: 'Ô nhập chữ', code: 'homestayForm.address', dataType: 'string', required: 'Có', rule: 'Tối đa 255 ký tự.', note: 'Biến {dia_chi}.' },
    { shot: 'homestay', sel: '#map', label: 'Link bản đồ', kind: 'Ô nhập chữ', code: 'homestayForm.mapLink', dataType: 'string', required: 'Không', rule: 'Tối đa 255 ký tự; trống lưu NULL.', note: 'Biến {ban_do}.' },
    { shot: 'homestay', sel: '#wifi', label: 'Tên wifi', kind: 'Ô nhập chữ', code: 'homestayForm.wifiName', dataType: 'string', required: 'Không', rule: 'Tối đa 100 ký tự.', note: 'Biến {wifi}.' },
    { shot: 'homestay', sel: '#wpass', label: 'Mật khẩu wifi', kind: 'Ô nhập chữ', code: 'homestayForm.wifiPassword', dataType: 'string', required: 'Không', rule: 'Tối đa 100 ký tự.', note: 'Biến {mat_khau_wifi}.' },
    {
      shot: 'homestay', sel: '.info .cf .btn-p', label: 'Lưu thông tin', kind: 'Nút chính', code: 'saveHomestay()',
      note: 'Chỉ Quản lý. PUT /settings/homestay; thành công điền lại form (không có thông báo riêng), lỗi hiện hộp đỏ.',
    },
    { shot: 'staff', sel: `${EDITOR}`, label: 'Form khi Nhân viên xem', kind: 'Form bị khoá', code: '<fieldset [disabled]="!isManager()">', badge: 'inside', note: 'Mọi ô và nút chèn biến bị khoá; không có Thêm mẫu, Xoá/Huỷ/Lưu.' },
  ],
  logic: [
    { title: 'LOGIC MÀN CÀI ĐẶT' },
    { h: '1. Khởi tạo' },
    {
      list: [
        'GET /api/message-templates (sắp theo tên, kèm containsDoorCode) → chọn sẵn mẫu đầu tiên; GET /api/settings/homestay (1 dòng, id = 1).',
        'Mọi vai trò xem được; API thêm/sửa/xoá chỉ Quản lý (@PreAuthorize).',
      ],
    },
    { h: '2. Mẫu tin nhắn' },
    {
      list: [
        'Lưu: form thiếu tên / nội dung → ô viền đỏ, hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ).", không gửi. POST /api/message-templates hoặc PUT /api/message-templates/{id} { name, body, defaultForCheckInMode }.',
        'Backend: chọn mặc định cho một hình thức → mẫu khác đang mặc định cho hình thức đó tự về NULL (mỗi hình thức tối đa 1 mẫu).',
        'Xoá: DELETE /api/message-templates/{id} (xoá cứng vì đơn không tham chiếu mẫu — chỉ ghép nội dung lúc sao chép).',
        'Không ghi nhật ký thao tác (cấu hình). Lỗi: 404 "Mẫu tin nhắn không tồn tại"; 400 "Dữ liệu không hợp lệ" (thiếu tên/nội dung, tên > 100 hoặc nội dung > 2000 ký tự khi gọi thẳng API — errors.{trường} "Tối đa N ký tự").',
        'Xem trước (frontend): renderMessageTemplate(nội dung, buildSampleMessageContext(homestay đã lưu, ký tự đánh dấu)) rồi tách theo ký tự đánh dấu của {ma_cua} để chèn chữ che vào giữa — mã cửa thật không bao giờ được lấy ở màn này.',
      ],
    },
    { h: '3. Biến dùng trong nội dung' },
    {
      table: {
        cols: [{ h: 'Nút', w: 7 }, { h: 'Biến', w: 6 }, { h: 'Giá trị khi sao chép (core/message-template.ts)', w: 19 }],
        rows: [
          ['Tên khách', '{ten_khach}', 'Họ tên khách'],
          ['Mã đơn', '{ma_don}', 'SH-xxxx'],
          ['Phòng', '{phong}', '"{số} · {tên phòng}"'],
          ['Loại thuê', '{loai_thue}', 'theo giờ / qua đêm / theo ngày'],
          ['Giờ nhận / Giờ trả', '{gio_nhan} {gio_tra}', '"HH:mm, dd/MM/yyyy"'],
          ['Số khách', '{so_khach}', 'Số khách'],
          ['Tổng tiền / Đã cọc / Còn phải thu', '{tong_tien} {da_coc} {con_phai_thu}', 'Định dạng 1.250.000đ'],
          ['Mã cửa', '{ma_cua}', 'Mã cửa giải mã (lấy qua API, ghi nhật ký "Sao chép tin nhắn có mã cửa")'],
          ['Hướng dẫn của phòng', '{huong_dan}', 'Hướng dẫn tự nhận phòng hiện hành của phòng (màn Sửa phòng)'],
          ['Tên homestay / Địa chỉ / Link bản đồ / Hotline / Tên wifi / Mật khẩu wifi', '{ten_homestay} {dia_chi} {ban_do} {hotline} {wifi} {mat_khau_wifi}', 'Tab Thông tin homestay'],
        ],
      },
    },
    { h: '4. Thông tin homestay' },
    {
      list: [
        'Lưu: thiếu tên / hotline / địa chỉ → ô viền đỏ, hộp lỗi "Vui lòng nhập đủ các ô bắt buộc (viền đỏ).", không gửi. PUT /api/settings/homestay { name, hotline, address, mapLink, wifiName, wifiPassword } (ô trống tuỳ chọn gửi null).',
        'Không ghi nhật ký thao tác. Lỗi khác: "Không lưu được thông tin, thử lại sau."',
      ],
    },
  ],
};
