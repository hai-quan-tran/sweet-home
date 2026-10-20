// Nội dung file 00_TongThe.xlsx: kiến trúc, ERD, bảng/cột DB, tác vụ nền, bảo mật, trạng thái đơn, danh sách API.
import { DESIGN_FILES, FIRST_VERSION } from '../common.mjs';

const AUDIT = {
  created_at: 'Thời điểm tạo (JPA Auditing tự ghi)',
  created_by: 'Tên đăng nhập người tạo ("system" nếu do tác vụ nền)',
  updated_at: 'Thời điểm sửa gần nhất',
  updated_by: 'Tên đăng nhập người sửa gần nhất',
};

/** Ý nghĩa từng bảng và cột (cột audit dùng mô tả chung AUDIT). */
const TABLES = {
  account: {
    title: 'Tài khoản đăng nhập (Quản lý, Nhân viên)',
    entity: 'auth/Account.java',
    cols: {
      id: 'Khoá chính',
      username: 'Tên đăng nhập, duy nhất, không đổi được sau khi tạo',
      password_hash: 'Mật khẩu băm BCrypt',
      full_name: 'Họ tên',
      role: 'Vai trò: MANAGER (Quản lý) / STAFF (Nhân viên)',
      status: 'ACTIVE (hoạt động) / LOCKED (đã khoá — không đăng nhập được, request đang chạy bị từ chối ngay)',
      must_change_password: '1 = bắt đổi mật khẩu ở lần đăng nhập tới (tài khoản mới, vừa đặt lại mật khẩu tạm)',
      phone: 'Số điện thoại',
      id_number_encrypted: 'CCCD mã hoá AES-256/GCM (Base64 của IV + bản mã)',
      id_number_last4: '4 số cuối CCCD (hiển thị dạng che "•••• 1234")',
      start_date: 'Ngày bắt đầu làm; trước ngày này không xếp ca được',
      failed_login_count: 'Số lần sai mật khẩu liên tiếp; đủ 5 thì khoá tạm, đăng nhập đúng thì về 0',
      login_locked_until: 'Khoá tạm đăng nhập tới thời điểm này (15 phút sau lần sai thứ 5)',
    },
  },
  refresh_token: {
    title: 'Refresh token của các phiên đăng nhập (để thu hồi khi đăng xuất, đổi mật khẩu, khoá tài khoản)',
    entity: 'auth/RefreshToken.java',
    cols: {
      id: 'Khoá chính',
      account_id: 'Tài khoản (xoá tài khoản thì xoá theo)',
      token_hash: 'SHA-256 của refresh token (không lưu token gốc)',
      expires_at: 'Hết hạn: 7 ngày, hoặc 30 ngày nếu chọn "Ghi nhớ trên thiết bị này"',
      revoked: '1 = đã thu hồi (đăng xuất, đã xoay sang token mới, đổi/đặt lại mật khẩu, khoá tài khoản)',
      remembered: '1 = phiên "Ghi nhớ thiết bị" (khi xoay token vẫn cấp hạn 30 ngày)',
      created_at: 'Thời điểm cấp',
    },
  },
  room_type: {
    title: 'Hạng phòng và 4 mức giá (xoá mềm bằng cờ active)',
    entity: 'room/RoomType.java',
    cols: {
      id: 'Khoá chính',
      name: 'Tên hạng phòng, duy nhất',
      two_hour_price: 'Giá cho số giờ tối thiểu đầu tiên (mặc định 2 giờ). Tiền theo giờ = giá này + (số giờ − số giờ tối thiểu) × giá mỗi giờ thêm',
      extra_hour_price: 'Giá mỗi giờ thêm (VND); cũng là mức phụ thu quá giờ và phí gia hạn theo giờ',
      overnight_price: 'Giá qua đêm (VND)',
      daily_price: 'Giá theo ngày (VND); cũng là phí gia hạn theo ngày',
      active: '0 = đã ẩn (không chọn được khi thêm/sửa phòng); chỉ ẩn được khi không còn phòng dùng',
    },
  },
  pricing_settings: {
    title: 'Khung giờ chung của bảng giá (chỉ 1 dòng, id = 1)',
    entity: 'room/PricingSettings.java',
    cols: {
      id: 'Luôn = 1',
      min_hours: 'Số giờ tối thiểu khi thuê theo giờ (mặc định 2)',
      overnight_check_in: 'Giờ nhận phòng qua đêm',
      overnight_check_out: 'Giờ trả phòng qua đêm (hôm sau)',
      daily_check_in: 'Giờ nhận phòng theo ngày',
      daily_check_out: 'Giờ trả phòng theo ngày',
    },
  },
  room: {
    title: 'Phòng (không xoá được, chỉ tắt nhận đặt)',
    entity: 'room/Room.java',
    cols: {
      id: 'Khoá chính',
      room_number: 'Số phòng, duy nhất (vd 101)',
      name: 'Tên phòng',
      floor: 'Tầng',
      room_type_id: 'Hạng phòng',
      max_guests: 'Số khách tối đa; vượt thì áp phụ thu "Vượt số khách"',
      bed_config: 'Mô tả giường (vd 1 giường đôi)',
      description: 'Mô tả phòng',
      pricing_mode: 'ROOM_TYPE = giá theo hạng / OWN = giá riêng của phòng',
      own_two_hour_price: 'Giá riêng 2 giờ đầu (bắt buộc khi OWN)',
      own_extra_hour_price: 'Giá riêng mỗi giờ thêm (bắt buộc khi OWN)',
      own_overnight_price: 'Giá riêng qua đêm (bắt buộc khi OWN)',
      own_daily_price: 'Giá riêng theo ngày (bắt buộc khi OWN)',
      default_check_in_mode: 'Hình thức check-in mặc định: SELF (khách tự check-in) / STAFF (nhân viên đón)',
      check_in_guide: 'Hướng dẫn nhận phòng, chèn vào tin nhắn qua biến {huong_dan}',
      accepting_bookings: '0 = tắt nhận đặt (không tạo đơn mới, không hiện trong lựa chọn chuyển phòng)',
      needs_cleaning: '1 = Chờ dọn (sau trả phòng / chuyển phòng); bấm "Đã dọn" về 0',
    },
  },
  room_photo: {
    title: 'Ảnh phòng (file lưu trên đĩa server, DB lưu tên file)',
    entity: 'room/RoomPhoto.java',
    cols: {
      id: 'Khoá chính',
      room_id: 'Phòng (xoá phòng thì xoá theo)',
      file_path: 'Tên file sinh ngẫu nhiên (UUID + đuôi theo loại ảnh thật: jpg/png/webp)',
      sort_order: 'Thứ tự ảnh; 0 = ảnh bìa',
    },
  },
  surcharge: {
    title: 'Phụ thu (xoá mềm bằng cờ active)',
    entity: 'surcharge/Surcharge.java',
    cols: {
      id: 'Khoá chính',
      name: 'Tên phụ thu (hiện trên đơn)',
      when_type:
        'Áp dụng khi: OVERSTAY (quá giờ trả) · EXTRA_GUEST (vượt số khách) · WEEKDAY (ngày trong tuần) · DATE_RANGE (khoảng ngày) · MANUAL (thêm tay)',
      amount: 'Mức thu, đơn vị theo loại: EXTRA_GUEST đ/khách vượt · WEEKDAY, DATE_RANGE % tiền phòng · MANUAL đ/lần · OVERSTAY để trống',
      grace_minutes: 'Phút ân hạn (chỉ OVERSTAY, mặc định 15)',
      active: '0 = đã ẩn; OVERSTAY và EXTRA_GUEST mỗi loại tối đa 1 bản ghi đang dùng',
    },
  },
  surcharge_weekday: {
    title: 'Các ngày trong tuần của phụ thu WEEKDAY',
    entity: 'Surcharge.weekdays (@ElementCollection)',
    cols: { surcharge_id: 'Phụ thu', weekday: 'MONDAY … SUNDAY' },
  },
  surcharge_date_range: {
    title: 'Các khoảng ngày (dịp lễ) của phụ thu DATE_RANGE',
    entity: 'surcharge/SurchargeDateRange.java',
    cols: { id: 'Khoá chính', surcharge_id: 'Phụ thu', name: 'Tên dịp (vd Tết Nguyên đán)', from_date: 'Từ ngày (tính cả ngày này)', to_date: 'Đến ngày (tính cả ngày này)' },
  },
  surcharge_room_type: {
    title: 'Phụ thu áp dụng cho hạng phòng nào (nhiều – nhiều)',
    entity: 'Surcharge.roomTypes (@ManyToMany)',
    cols: { surcharge_id: 'Phụ thu', room_type_id: 'Hạng phòng' },
  },
  homestay_info: {
    title: 'Thông tin homestay dùng cho tin nhắn gửi khách (chỉ 1 dòng, id = 1)',
    entity: 'settings/HomestayInfo.java',
    cols: {
      id: 'Luôn = 1',
      name: 'Tên homestay — biến {ten_homestay}',
      hotline: 'Hotline — biến {hotline}',
      address: 'Địa chỉ — biến {dia_chi}',
      map_link: 'Link bản đồ — biến {ban_do}',
      wifi_name: 'Tên wifi — biến {wifi}',
      wifi_password: 'Mật khẩu wifi — biến {mat_khau_wifi}',
    },
  },
  message_template: {
    title: 'Mẫu tin nhắn gửi khách (xoá cứng được — đơn không tham chiếu tới mẫu)',
    entity: 'settings/MessageTemplate.java',
    cols: {
      id: 'Khoá chính',
      name: 'Tên mẫu',
      body: 'Nội dung có biến dạng {ten_bien}, ghép ở frontend lúc sao chép',
      default_for_check_in_mode: 'SELF / STAFF = mẫu chọn sẵn cho đơn có hình thức đó (mỗi hình thức tối đa 1 mẫu); NULL = không',
    },
  },
  rental_order: {
    title: 'Đơn thuê. Mã đơn hiển thị = "SH-" + (1000 + id), không lưu cột riêng',
    entity: 'order/RentalOrder.java',
    cols: {
      id: 'Khoá chính',
      status: 'BOOKED (Đã đặt) · CHECKED_IN (Đang ở) · OVERSTAY (Quá giờ) · PENDING_CHECKOUT (Chờ xác nhận trả) · CHECKED_OUT (Đã trả) · CANCELLED (Đã huỷ)',
      room_id: 'Phòng hiện tại = phòng của chặng cuối',
      rental_type: 'HOURLY (theo giờ) / OVERNIGHT (qua đêm) / DAILY (theo ngày)',
      check_in_at: 'Giờ nhận phòng hẹn = đầu chặng đầu',
      check_out_at: 'Giờ trả phòng hẹn = cuối chặng cuối (gia hạn thì dời)',
      guest_name: 'Họ tên khách',
      guest_phone: 'SĐT khách',
      guest_id_number_encrypted: 'CCCD/hộ chiếu mã hoá AES-256/GCM',
      guest_id_number_last4: '4 ký tự cuối CCCD (hiển thị che)',
      guest_count: 'Số khách',
      source: 'Nguồn đặt: ZALO, FACEBOOK, PHONE, REGULAR (khách quen), OTHER',
      note: 'Ghi chú',
      check_in_mode: 'SELF (khách tự check-in) / STAFF (nhân viên đón) — của riêng đơn này',
      door_code_encrypted: 'Mã cửa mã hoá AES-256/GCM (bắt buộc khi SELF); xem/sao chép qua API riêng, có ghi nhật ký',
      deposit: 'Tiền cọc (> 0, ≤ tổng tiền); tính vào "Đã thu"',
      deposit_method: 'Hình thức cọc: TRANSFER (chuyển khoản) / CASH (tiền mặt)',
      discount: 'Giảm giá (VND)',
      discount_reason: 'Lý do giảm giá',
      room_type_name_snapshot: 'Tên hạng phòng lúc đặt (không đổi khi hạng phòng bị sửa/ẩn)',
      two_hour_price_snapshot: 'Giá 2 giờ đầu lúc đặt',
      extra_hour_price_snapshot: 'Giá mỗi giờ thêm lúc đặt (dùng cho quá giờ, gia hạn theo giờ)',
      overnight_price_snapshot: 'Giá qua đêm lúc đặt',
      daily_price_snapshot: 'Giá ngày lúc đặt (dùng cho gia hạn theo ngày)',
      room_price_amount: 'Tiền phòng đã tính theo loại thuê',
      total_amount: 'Tổng tiền = tiền phòng + phụ thu − giảm giá (cộng thêm phụ thu khi trả phòng, phí gia hạn)',
      actual_check_in_at: 'Giờ nhận thực tế',
      actual_check_out_at: 'Giờ trả thực tế',
      cancelled_at: 'Thời điểm huỷ',
      refund_amount: 'Số tiền hoàn khi huỷ',
      cancel_reason: 'Lý do huỷ (bắt buộc khi số hoàn khác mức tự tính)',
    },
  },
  order_stay: {
    title: 'Chặng của đơn: phòng + khoảng thời gian. Mọi đơn ≥ 1 chặng; gia hạn chuyển phòng thêm chặng mới',
    entity: 'order/OrderStay.java',
    cols: {
      id: 'Khoá chính',
      order_id: 'Đơn (xoá đơn thì xoá theo)',
      room_id: 'Phòng của chặng',
      start_at: 'Bắt đầu chặng',
      end_at: 'Kết thúc chặng',
      cleaning_requested: '1 = đã chuyển phòng của chặng (không phải chặng cuối, đã kết thúc) sang Chờ dọn — chỉ làm 1 lần',
    },
  },
  order_surcharge: {
    title: 'Phụ thu đã áp vào đơn (snapshot tên + số tiền, không tham chiếu bảng surcharge)',
    entity: 'order/OrderSurcharge.java',
    cols: { id: 'Khoá chính', order_id: 'Đơn', name: 'Tên dòng (vd "Cuối tuần", "Quá giờ 2 giờ", "Gia hạn +2 giờ")', amount: 'Số tiền (VND)' },
  },
  order_payment: {
    title: 'Khoản thu thêm ngoài cọc (người thu, giờ thu lấy từ created_by/created_at)',
    entity: 'order/OrderPayment.java',
    cols: { id: 'Khoá chính', order_id: 'Đơn', amount: 'Số tiền (> 0)', method: 'TRANSFER / CASH', note: 'Ghi chú (vd "Thu khi trả phòng", "Thu khi gia hạn")' },
  },
  activity_log: {
    title: 'Nhật ký thao tác (chỉ thêm, không sửa/xoá; chỉ Quản lý xem)',
    entity: 'activity/ActivityLog.java',
    cols: {
      id: 'Khoá chính',
      created_at: 'Thời điểm thao tác',
      actor: 'Tên đăng nhập người thao tác; "system" = tác vụ nền',
      action: 'Loại thao tác (enum ActivityAction, xem sheet 4)',
      detail: 'Câu mô tả tiếng Việt (tối đa 255 ký tự)',
      order_id: 'Đơn liên quan (không khoá ngoại)',
      room_number: 'Số phòng lúc thao tác (chuỗi, không đổi theo phòng)',
    },
  },
  shift_template: {
    title: 'Ca mẫu (mặc định Sáng 06–14, Chiều 14–22, Đêm 22–06)',
    entity: 'schedule/ShiftTemplate.java',
    cols: {
      id: 'Khoá chính',
      name: 'Tên ca',
      start_time: 'Giờ bắt đầu',
      end_time: 'Giờ kết thúc; ≤ giờ bắt đầu = kết thúc hôm sau',
      color: 'Màu 1–6',
    },
  },
  work_shift: {
    title: 'Ca đã xếp (lưu bản sao giờ, tên, màu lúc xếp — sửa/xoá ca mẫu không ảnh hưởng)',
    entity: 'schedule/WorkShift.java',
    cols: {
      id: 'Khoá chính',
      account_id: 'Tài khoản làm ca',
      template_id: 'Ca mẫu đã dùng; NULL = ca lẻ hoặc ca mẫu đã bị xoá',
      name: 'Tên ca (bản sao)',
      color: 'Màu (bản sao); 0 = ca lẻ',
      start_at: 'Bắt đầu; ca thuộc ngày của start_at',
      end_at: 'Kết thúc',
      edited: '1 = giờ khác ca mẫu lúc lưu (hiện "Đã sửa")',
      note: 'Ghi chú',
    },
  },
};

const TABLE_ORDER = [
  'account', 'refresh_token', 'room_type', 'pricing_settings', 'room', 'room_photo', 'surcharge', 'surcharge_weekday',
  'surcharge_date_range', 'surcharge_room_type', 'homestay_info', 'message_template', 'rental_order', 'order_stay',
  'order_surcharge', 'order_payment', 'activity_log', 'shift_template', 'work_shift',
];

/**
 * Sheet 3: mỗi bảng DB một mục — cột, kiểu, null, mặc định, khoá (đọc thật từ DB) + ý nghĩa.
 * @param {{schema: object}} env cấu trúc DB đọc lúc chạy capture
 */
function dbBlocks({ schema }) {
  if (!schema) throw new Error('Thiếu out/schema.json — chạy capture.mjs trước.');
  const missing = schema.tables.filter((t) => !TABLES[t]);
  if (missing.length) throw new Error('Chưa mô tả bảng: ' + missing.join(', '));
  const blocks = [
    { title: 'CƠ SỞ DỮ LIỆU (MySQL 8, schema do Liquibase quản lý)' },
    {
      p: 'Cấu trúc đọc trực tiếp từ DB dev lúc sinh tài liệu (information_schema). Changelog: backend/src/main/resources/db/changelog/*.yaml. ' +
        'Quy ước: tiền là BIGINT (VND, số nguyên); giờ theo Asia/Ho_Chi_Minh; cột boolean khai báo BIT; bảng nghiệp vụ có 4 cột audit created_at/by, updated_at/by.',
    },
    { h: 'Danh sách bảng' },
    {
      table: {
        cols: [{ h: 'STT', w: 2 }, { h: 'Bảng', w: 7 }, { h: 'Ý nghĩa', w: 16 }, { h: 'Entity / mã nguồn', w: 7 }],
        rows: TABLE_ORDER.map((t, i) => [i + 1, t, TABLES[t].title, TABLES[t].entity]),
      },
    },
  ];
  for (const t of TABLE_ORDER) {
    const fks = schema.foreignKeys.filter((f) => f.table === t);
    const rows = schema.columns
      .filter((c) => c.table === t)
      .map((c) => {
        const fk = fks.find((f) => f.column === c.column);
        const key = [c.key === 'PRI' && 'PK', c.key === 'UNI' && 'UNIQUE', fk && `FK → ${fk.refTable}.${fk.refColumn}${fk.onDelete === 'CASCADE' ? ' (xoá theo)' : fk.onDelete === 'SET NULL' ? ' (về NULL)' : ''}`]
          .filter(Boolean)
          .join('\n');
        const desc = TABLES[t].cols[c.column] ?? AUDIT[c.column];
        if (!desc) throw new Error(`Chưa mô tả cột ${t}.${c.column}`);
        const def = c.default?.replace(/^b'(\d)'$/, '$1') ?? '';
        return [c.pos, c.column, c.type + (c.extra === 'auto_increment' ? ' (tự tăng)' : ''), c.nullable ? 'Có' : 'Không', def, key, desc];
      });
    const idx = schema.indexes.filter((i) => i.table === t && i.name !== 'PRIMARY' && !fks.some((f) => f.column === i.columns && i.name.startsWith('fk_')));
    blocks.push(
      { h: `${t} — ${TABLES[t].title}` },
      {
        table: {
          cols: [{ h: 'STT', w: 1 }, { h: 'Cột', w: 6 }, { h: 'Kiểu', w: 4 }, { h: 'Null', w: 2 }, { h: 'Mặc định', w: 3 }, { h: 'Khoá', w: 5 }, { h: 'Ý nghĩa', w: 11 }],
          rows,
        },
      },
      ...(idx.length ? [{ note: 'Index: ' + idx.map((i) => `${i.name} (${i.columns})${i.unique ? ' unique' : ''}`).join('; ') }] : []),
    );
  }
  return blocks;
}

const API = [
  ['POST', '/auth/login', 'Không cần đăng nhập', 'Đăng nhập, đặt cookie access/refresh token. Sai 5 lần liên tiếp → khoá tạm 15 phút (429)', '01'],
  ['POST', '/auth/refresh', 'Không cần đăng nhập (cần cookie refresh)', 'Cấp lại access token, xoay refresh token (thu hồi token cũ)', '03'],
  ['POST', '/auth/logout', 'Không cần đăng nhập', 'Thu hồi refresh token, xoá cookie', '03'],
  ['GET', '/auth/me', 'Đã đăng nhập', 'Tài khoản đang đăng nhập (họ tên, vai trò, bắt đổi mật khẩu)', '01–03'],
  ['POST', '/auth/change-password', 'Đã đăng nhập', 'Đổi mật khẩu, thu hồi mọi phiên khác, cấp token mới', '02'],
  ['GET', '/dashboard', 'Mọi vai trò (doanh thu chỉ Quản lý)', 'Số liệu Tổng quan', '04'],
  ['GET', '/notifications', 'Mọi vai trò ("không ai trực" chỉ Quản lý)', 'Thông báo trên chuông', '03'],
  ['GET', '/orders', 'Mọi vai trò', 'Danh sách đơn: lọc trạng thái, phòng, tìm kiếm, phân trang (size ≤ 100)', '06'],
  ['GET', '/orders/stays', 'Mọi vai trò', 'Các chặng giao với khoảng thời gian (≤ 31 ngày) để vẽ lịch', '05'],
  ['GET', '/orders/{id}', 'Mọi vai trò', 'Chi tiết đơn', '07'],
  ['GET', '/orders/{id}/door-code', 'Quản lý; Nhân viên chỉ khi đang trong ca hoặc đơn giao với ca của mình', 'Mã cửa đã giải mã; ghi nhật ký xem / sao chép (forMessage=true)', '07'],
  ['POST', '/orders/preview', 'Mọi vai trò', 'Xem trước giờ trả, phòng trống, tiền tạm tính (không lưu)', '08'],
  ['POST', '/orders', 'Mọi vai trò', 'Tạo đơn', '08'],
  ['PUT', '/orders/{id}', 'Mọi vai trò (sửa cọc chỉ Quản lý)', 'Sửa đơn Đã đặt', '08'],
  ['POST', '/orders/{id}/check-in', 'Mọi vai trò', 'Nhận phòng (đơn Đã đặt)', '07'],
  ['POST', '/orders/{id}/checkout/preview', 'Mọi vai trò', 'Xem trước tiền trả phòng', '07'],
  ['POST', '/orders/{id}/checkout', 'Mọi vai trò', 'Trả phòng / xác nhận trả, thu đủ số còn lại', '07'],
  ['POST', '/orders/{id}/extend/preview', 'Mọi vai trò', 'Xem trước gia hạn, phòng chuyển được', '09'],
  ['POST', '/orders/{id}/extend', 'Mọi vai trò', 'Gia hạn (có thể chuyển phòng)', '09'],
  ['GET', '/orders/{id}/cancel/preview', 'Mọi vai trò', 'Mức hoàn cọc mặc định nếu huỷ bây giờ', '07'],
  ['POST', '/orders/{id}/cancel', 'Mọi vai trò (NV chỉ đơn chưa thu ngoài cọc, không sửa số hoàn)', 'Huỷ đơn', '07'],
  ['POST', '/orders/{id}/payments', 'Mọi vai trò', 'Thu thêm một khoản', '07'],
  ['PUT', '/orders/{id}/payments/{paymentId}', 'Chỉ Quản lý', 'Sửa khoản đã thu', '07'],
  ['DELETE', '/orders/{id}/payments/{paymentId}', 'Chỉ Quản lý', 'Xoá khoản đã thu', '07'],
  ['GET', '/rooms', 'Mọi vai trò', 'Danh sách phòng (kèm giá áp dụng, trạng thái dọn)', '05, 08, 10'],
  ['GET', '/rooms/{id}', 'Mọi vai trò', 'Chi tiết phòng', '07, 11'],
  ['POST', '/rooms', 'Chỉ Quản lý', 'Thêm phòng', '11'],
  ['PUT', '/rooms/{id}', 'Chỉ Quản lý', 'Sửa phòng', '11'],
  ['PATCH', '/rooms/{id}/accepting-bookings', 'Chỉ Quản lý', 'Bật/tắt nhận đặt', '10'],
  ['POST', '/rooms/{id}/cleaned', 'Mọi vai trò', 'Đánh dấu Đã dọn', '07, 10'],
  ['POST', '/rooms/{id}/photos', 'Chỉ Quản lý', 'Tải ảnh phòng (multipart, JPG/PNG/WebP, ≤ 5 MB/ảnh)', '11'],
  ['DELETE', '/rooms/{id}/photos/{photoId}', 'Chỉ Quản lý', 'Xoá ảnh phòng', '11'],
  ['GET', '/room-photos/{photoId}', 'Mọi vai trò', 'Nội dung ảnh phòng', '10, 11'],
  ['GET', '/room-types/overview', 'Mọi vai trò', 'Bảng giá: hạng phòng (đang dùng, đã ẩn) + khung giờ chung', '10, 11, 12'],
  ['PUT', '/room-types/overview', 'Chỉ Quản lý', 'Lưu cả bảng giá (thêm/sửa/ẩn hạng, khung giờ)', '12'],
  ['GET', '/surcharges', 'Mọi vai trò', 'Danh sách phụ thu (gồm đã ẩn)', '10'],
  ['POST', '/surcharges', 'Chỉ Quản lý', 'Thêm phụ thu', '13'],
  ['PUT', '/surcharges/{id}', 'Chỉ Quản lý', 'Sửa phụ thu', '13'],
  ['PATCH', '/surcharges/{id}/active', 'Chỉ Quản lý', 'Ẩn / khôi phục phụ thu', '10'],
  ['GET', '/accounts', 'Mọi vai trò', 'Danh sách tài khoản', '14, 16'],
  ['GET', '/accounts/{id}', 'Mọi vai trò', 'Chi tiết tài khoản', '15'],
  ['POST', '/accounts', 'Chỉ Quản lý', 'Thêm tài khoản', '15'],
  ['PUT', '/accounts/{id}', 'Chỉ Quản lý', 'Sửa tài khoản, khoá/mở, đặt lại mật khẩu tạm', '15'],
  ['GET', '/activity-logs', 'Chỉ Quản lý', 'Nhật ký thao tác: lọc từ thời điểm, theo người, phân trang (size ≤ 100)', '14'],
  ['GET', '/shift-templates', 'Mọi vai trò', 'Danh sách ca mẫu', '16'],
  ['POST', '/shift-templates', 'Chỉ Quản lý', 'Thêm ca mẫu', '16'],
  ['PUT', '/shift-templates/{id}', 'Chỉ Quản lý', 'Sửa ca mẫu (chỉ áp dụng ca xếp sau)', '16'],
  ['DELETE', '/shift-templates/{id}', 'Chỉ Quản lý', 'Xoá ca mẫu (ca đã xếp giữ nguyên)', '16'],
  ['GET', '/shifts', 'Mọi vai trò', 'Ca có ngày trong [from, to) (≤ 31 ngày)', '14, 16'],
  ['GET', '/shifts/coverage', 'Chỉ Quản lý', 'Đơn cần nhân viên đón và đơn không ai trực', '16'],
  ['POST', '/shifts', 'Chỉ Quản lý', 'Xếp ca', '16'],
  ['PUT', '/shifts/{id}', 'Chỉ Quản lý', 'Sửa ca', '16'],
  ['DELETE', '/shifts/{id}', 'Chỉ Quản lý', 'Xoá ca', '16'],
  ['POST', '/shifts/copy-week', 'Chỉ Quản lý', 'Sao chép ca tuần trước sang tuần bắt đầu weekStart (thứ Hai)', '16'],
  ['GET', '/settings/homestay', 'Mọi vai trò', 'Thông tin homestay', '07, 17'],
  ['PUT', '/settings/homestay', 'Chỉ Quản lý', 'Sửa thông tin homestay', '17'],
  ['GET', '/message-templates', 'Mọi vai trò', 'Danh sách mẫu tin nhắn', '07, 17'],
  ['POST', '/message-templates', 'Chỉ Quản lý', 'Thêm mẫu', '17'],
  ['PUT', '/message-templates/{id}', 'Chỉ Quản lý', 'Sửa mẫu', '17'],
  ['DELETE', '/message-templates/{id}', 'Chỉ Quản lý', 'Xoá mẫu', '17'],
];

export default {
  file: '00_TongThe',
  title: 'Tổng thể hệ thống',
  kind: 'Tài liệu tổng thể (không phải màn hình)',
  summary:
    'Phần nền chung cho mọi file detail design: kiến trúc, mô hình dữ liệu (ERD), từng bảng/cột DB, tác vụ nền, bảo mật, ' +
    'vòng đời trạng thái đơn, nhật ký thao tác và danh sách API. Nên đọc file này trước các file màn hình.',
  access: 'Không áp dụng.',
  roles: 'Không áp dụng (quyền từng API: sheet 4).',
  sources: [
    'backend/src/main/java/com/sweethome/** (controller, service, entity)',
    'backend/src/main/resources/db/changelog/*.yaml (Liquibase)',
    'backend/src/main/resources/application*.yml (cấu hình)',
    'frontend/src/app/** (Angular)',
  ],
  sheetNames: ['Thông tin', 'Kiến trúc & ERD', 'Cơ sở dữ liệu', 'Logic & API'],
  sheetDescriptions: [
    'Thông tin chung, danh sách các file detail design, lịch sử cập nhật.',
    'Công nghệ, sơ đồ kiến trúc, cấu trúc mã nguồn, sơ đồ quan hệ dữ liệu (ERD).',
    'Từng bảng DB: cột, kiểu, null, mặc định, khoá, ý nghĩa.',
    'Quy ước API & lỗi, bảo mật, tác vụ nền, trạng thái đơn, nhật ký thao tác, danh sách API.',
  ],
  history: FIRST_VERSION,
  extraInfo: [
    { h: 'Danh sách file detail design' },
    { table: { cols: [{ h: 'File', w: 8 }, { h: 'Nội dung', w: 24 }], rows: DESIGN_FILES.map(([f, d]) => [f + '.xlsx', d]) } },
    {
      note:
        'Mọi file được sinh tự động bằng công cụ docs/tools (xem docs/tools/README.md): ảnh chụp từ app thật với dữ liệu mẫu, ' +
        'số đánh dấu trên ảnh và bảng Chi tiết mục lấy từ cùng một danh sách khai báo nên luôn khớp nhau.',
    },
  ],
  diagrams: {
    architecture: `flowchart TB
  U["Người dùng<br/>Quản lý · Nhân viên<br/>Desktop / Laptop / iPad"] -->|HTTPS| P
  subgraph FE["Frontend · Angular 21 + PrimeNG (Aura)"]
    direction LR
    P["pages/*<br/>màn hình, dialog"] --> S["core/*.service.ts<br/>gọi API"]
    S --> I["auth.interceptor<br/>401 → tự refresh token"]
  end
  I -->|"/api · JSON<br/>cookie access_token<br/>header X-XSRF-TOKEN"| F
  subgraph BE["Backend · Spring Boot 4 · Java 25"]
    direction LR
    F["Security filter chain<br/>CSRF · JwtAuthenticationFilter"] --> C["*Controller<br/>@PreAuthorize"]
    C --> SV["*Service<br/>nghiệp vụ · nhật ký"]
    J["OrderStatusScheduler<br/>mỗi phút"] --> SV
    SV --> R["*Repository<br/>Spring Data JPA"]
  end
  R --> DB[("MySQL 8<br/>Liquibase")]
  SV --> FS[("Ổ đĩa server<br/>ảnh phòng")]`,
    erd: `erDiagram
  account ||--o{ refresh_token : "phiên đăng nhập"
  account ||--o{ work_shift : "làm ca"
  shift_template |o--o{ work_shift : "xếp theo mẫu"
  room_type ||--o{ room : "thuộc hạng"
  room ||--o{ room_photo : "có ảnh"
  surcharge ||--o{ surcharge_weekday : "ngày trong tuần"
  surcharge ||--o{ surcharge_date_range : "khoảng ngày"
  surcharge }o--o{ room_type : "surcharge_room_type"
  room ||--o{ rental_order : "phòng hiện tại"
  rental_order ||--|{ order_stay : "các chặng"
  room ||--o{ order_stay : "ở phòng"
  rental_order ||--o{ order_surcharge : "phụ thu (snapshot)"
  rental_order ||--o{ order_payment : "khoản thu"
  rental_order |o..o{ activity_log : "order_id (không FK)"
  account {
    bigint id PK
    varchar username UK
    varchar role "MANAGER, STAFF"
    varchar status "ACTIVE, LOCKED"
  }
  room_type {
    bigint id PK
    varchar name UK
    bigint two_hour_price
    bigint extra_hour_price
    bigint overnight_price
    bigint daily_price
    bit active
  }
  room {
    bigint id PK
    varchar room_number UK
    bigint room_type_id FK
    varchar pricing_mode "ROOM_TYPE, OWN"
    varchar default_check_in_mode "SELF, STAFF"
    bit accepting_bookings
    bit needs_cleaning
  }
  surcharge {
    bigint id PK
    varchar when_type
    bigint amount
    int grace_minutes
    bit active
  }
  rental_order {
    bigint id PK
    varchar status
    bigint room_id FK
    varchar rental_type
    datetime check_in_at
    datetime check_out_at
    varchar check_in_mode
    bigint deposit
    bigint total_amount
  }
  order_stay {
    bigint id PK
    bigint order_id FK
    bigint room_id FK
    datetime start_at
    datetime end_at
  }
  work_shift {
    bigint id PK
    bigint account_id FK
    bigint template_id FK
    datetime start_at
    datetime end_at
  }
  activity_log {
    bigint id PK
    varchar actor
    varchar action
    bigint order_id
  }
  pricing_settings {
    bigint id PK "luôn = 1"
    int min_hours
  }
  homestay_info {
    bigint id PK "luôn = 1"
    varchar name
  }
  message_template {
    bigint id PK
    varchar default_for_check_in_mode
  }`,
    orderStatus: `stateDiagram-v2
  direction LR
  state "Đã đặt<br/>BOOKED" as BOOKED
  state "Đang ở<br/>CHECKED_IN" as CHECKED_IN
  state "Quá giờ<br/>OVERSTAY" as OVERSTAY
  state "Chờ xác nhận trả<br/>PENDING_CHECKOUT" as PENDING_CHECKOUT
  state "Đã trả<br/>CHECKED_OUT" as CHECKED_OUT
  state "Đã huỷ<br/>CANCELLED" as CANCELLED
  [*] --> BOOKED: Tạo đơn
  BOOKED --> CHECKED_IN: Nhận phòng (NV đón) /<br/>tới giờ nhận (khách tự check-in) *
  BOOKED --> CANCELLED: Huỷ
  CHECKED_IN --> OVERSTAY: Tới giờ trả (NV đón) *
  CHECKED_IN --> PENDING_CHECKOUT: Tới giờ trả (khách tự check-in) *
  CHECKED_IN --> CHECKED_OUT: Trả phòng
  CHECKED_IN --> CANCELLED: Huỷ (khách không đến)
  OVERSTAY --> CHECKED_OUT: Trả phòng
  OVERSTAY --> CHECKED_IN: Gia hạn
  PENDING_CHECKOUT --> CHECKED_OUT: Xác nhận trả
  PENDING_CHECKOUT --> CHECKED_IN: Gia hạn
  PENDING_CHECKOUT --> CANCELLED: Huỷ (khách tự check-in không đến)
  CHECKED_OUT --> [*]
  CANCELLED --> [*]`,
  },
  screen: [
    { title: 'KIẾN TRÚC & MÔ HÌNH DỮ LIỆU' },
    { h: 'Công nghệ' },
    {
      table: {
        cols: [{ h: 'Thành phần', w: 6 }, { h: 'Công nghệ', w: 12 }, { h: 'Ghi chú', w: 14 }],
        rows: [
          ['Frontend', 'Angular 21 (standalone, zoneless, signals), PrimeNG 21 theme Aura, primeicons, font Be Vietnam Pro', 'Primary xanh dương (blue-600), có dark mode; hỗ trợ desktop, laptop, iPad ≥ 9 inch'],
          ['Backend', 'Java 25, Spring Boot 4, Spring Security, Spring Data JPA, Liquibase, Maven Wrapper', 'API dưới context path /api; múi giờ Asia/Ho_Chi_Minh'],
          ['Cơ sở dữ liệu', 'MySQL 8', 'JPA ddl-auto = validate, schema do Liquibase quản lý'],
          ['Xác thực', 'JWT (access token) + refresh token, đặt trong cookie HttpOnly', 'Không lưu token ở localStorage/sessionStorage'],
          ['Test', 'JUnit 5 + Mockito (JaCoCo ≥ 80% dòng); Vitest qua ng test (≥ 80% dòng)', 'Dưới ngưỡng thì build lỗi'],
          ['Cấu hình', 'application.yml + application-{dev,stage,prod}.yml', 'stage/prod lấy kết nối và khoá bí mật từ biến môi trường'],
        ],
      },
    },
    { h: 'Sơ đồ kiến trúc' },
    { diagram: 'architecture' },
    { h: 'Cấu trúc mã nguồn backend (package com.sweethome)' },
    {
      table: {
        cols: [{ h: 'Package', w: 5 }, { h: 'Chức năng', w: 14 }, { h: 'Lớp chính', w: 13 }],
        rows: [
          ['auth', 'Đăng nhập, token, cookie, CSRF, đổi mật khẩu, khoá tạm, tài khoản admin ban đầu', 'AuthController, AuthService, JwtService, JwtAuthenticationFilter, SecurityConfig, Account'],
          ['staff', 'Quản lý tài khoản nhân viên', 'AccountController, AccountManagementService'],
          ['room', 'Phòng, ảnh phòng, hạng phòng, bảng giá, khung giờ chung', 'RoomController, RoomService, RoomPhotoStorageService, PricingController, PricingService'],
          ['surcharge', 'Phụ thu và bộ tính phụ thu', 'SurchargeController, SurchargeService, SurchargeCalculator'],
          ['order', 'Đơn thuê: tạo/sửa, vòng đời, thu tiền, gia hạn, chặng, tác vụ nền', 'OrderController, OrderService, OrderLifecycleService, OrderPaymentService, OrderExtensionService, OrderStatusScheduler'],
          ['schedule', 'Ca mẫu, xếp ca, độ phủ ca', 'ScheduleController, ScheduleService'],
          ['dashboard', 'Tổng quan và thông báo', 'DashboardController, DashboardService'],
          ['settings', 'Thông tin homestay, mẫu tin nhắn', 'HomestayController, MessageTemplateController'],
          ['activity', 'Nhật ký thao tác', 'ActivityLogController, ActivityLogService'],
          ['common', 'Lỗi chung (ProblemDetail), audit, mã hoá AES, đồng hồ', 'GlobalExceptionHandler, BusinessException, Auditable, CryptoService, TimeConfig'],
        ],
      },
    },
    { h: 'Cấu trúc mã nguồn frontend (frontend/src/app)' },
    {
      table: {
        cols: [{ h: 'Thư mục', w: 5 }, { h: 'Nội dung', w: 27 }],
        rows: [
          ['app.routes.ts', 'Route tiếng Việt không dấu; guard: authGuard (đăng nhập + bắt đổi mật khẩu), managerGuard (chỉ Quản lý), guestGuard (màn Đăng nhập)'],
          ['layout/', 'Khung ứng dụng (Shell): menu trái, thanh trên, chuông thông báo, nút dark mode, đăng xuất'],
          ['pages/', 'Mỗi màn một thư mục: login, change-password, dashboard, calendar, orders (danh sách, chi tiết, tạo/sửa, gia hạn), rooms (phòng, bảng giá, phụ thu), staff, schedule, settings'],
          ['core/', 'Service gọi API (*.service.ts), kiểu dữ liệu (*.models.ts), interceptor, guard, hàm thuần dùng chung (định dạng tiền/giờ, nhãn trạng thái, ghép tin nhắn, thông báo)'],
          ['theme/', 'Preset PrimeNG Aura: primary xanh dương, light blue-600 / dark blue-400'],
          ['styles.scss', 'Style dùng chung: nút .btn-p/.btn-s, .card, .tag (.t-*), ô nhập .inp/.sel, biến màu dark mode'],
        ],
      },
    },
    { h: 'Sơ đồ quan hệ dữ liệu (ERD)' },
    { note: 'Chỉ vẽ các cột chính; đủ cột của từng bảng ở sheet 3. pricing_settings, homestay_info, message_template là bảng độc lập.' },
    { diagram: 'erd' },
  ],
  detail: dbBlocks,
  logic: [
    { title: 'LOGIC CHUNG & DANH SÁCH API' },
    { h: '1. Quy ước API và lỗi' },
    {
      list: [
        'Mọi API dưới /api (dev: http://localhost:8090/api; frontend dev chuyển /api qua proxy.conf.json). Dữ liệu JSON; ngày YYYY-MM-DD, giờ HH:mm:ss, ngày giờ YYYY-MM-DDTHH:mm:ss theo giờ Việt Nam.',
        'Tiền là số nguyên VND (long). Phần trăm phụ thu là số nguyên.',
        'Lỗi trả dạng ProblemDetail (RFC 9457): { status, detail }. Lỗi nhập liệu (400) có thêm "errors": { tên trường: thông báo } — vd "Bắt buộc nhập", "Phải lớn hơn 0".',
        'Mã lỗi: 400 dữ liệu/nghiệp vụ không hợp lệ · 401 chưa đăng nhập/phiên hết hạn ("Chưa đăng nhập hoặc phiên đã hết hạn") · 403 không có quyền ("Không có quyền thực hiện") · 404 không tồn tại · 409 xung đột (trùng lịch, gia hạn đụng đơn sau) · 429 đang bị khoá tạm đăng nhập · 500 lỗi hệ thống (không trả chi tiết).',
        'Frontend hiện "detail" của lỗi cho người dùng; lỗi theo trường hiện dưới ô nhập tương ứng.',
      ],
    },
    { h: '2. Bảo mật' },
    {
      table: {
        cols: [{ h: 'Chủ đề', w: 6 }, { h: 'Cách làm', w: 26 }],
        rows: [
          ['Đăng nhập', 'Kiểm tra mật khẩu BCrypt. Tên đăng nhập không tồn tại vẫn so một hash giả (thời gian trả lời như nhau). Sai 5 lần liên tiếp → khoá tạm 15 phút (429, báo số phút còn lại); đăng nhập đúng thì đếm lại. Báo "Tài khoản đã bị khoá" chỉ khi mật khẩu đúng — không lộ tài khoản nào tồn tại.'],
          ['Token', 'Access token JWT 30 phút (claim accountId, role). Refresh token ngẫu nhiên, lưu SHA-256 trong refresh_token, hạn 7 ngày (30 ngày nếu "Ghi nhớ trên thiết bị này"); mỗi lần refresh xoay token mới, thu hồi token cũ.'],
          ['Cookie', 'access_token, refresh_token: HttpOnly, SameSite=Lax, Path=/api, Secure (tắt ở dev vì chạy HTTP). Không lưu token ở localStorage/sessionStorage.'],
          ['CSRF', 'Double-submit cookie: cookie XSRF-TOKEN (Path=/, JS đọc được) + header X-XSRF-TOKEN cho mọi request thay đổi dữ liệu; bỏ qua ở /auth/login, /auth/refresh, /auth/logout.'],
          ['Phân quyền', 'API cấu hình/nhân viên/lịch làm/nhật ký: @PreAuthorize("hasRole(\'MANAGER\')"). Quyền phụ thuộc dữ liệu (huỷ đơn, sửa cọc, mã cửa) kiểm tra trong service. Mỗi request nạp lại tài khoản từ DB: tài khoản bị khoá → 401 ngay, vai trò lấy từ DB (đổi vai trò có hiệu lực ngay). Frontend ẩn nút theo vai trò và chặn route bằng managerGuard (chỉ là lớp giao diện, backend vẫn kiểm tra).'],
          ['Mật khẩu', '≥ 8 ký tự, có cả chữ và số (PasswordPolicy). Tài khoản mới / đặt lại mật khẩu tạm bắt đổi ở lần đăng nhập đầu. Đổi mật khẩu, đặt lại mật khẩu, khoá tài khoản → thu hồi mọi refresh token.'],
          ['Dữ liệu nhạy cảm', 'CCCD (khách, nhân viên) và mã cửa mã hoá AES-256/GCM (CryptoService, IV ngẫu nhiên mỗi lần). CCCD chỉ trả dạng che 4 số cuối; mã cửa chỉ trả qua GET /orders/{id}/door-code, mỗi lần xem/sao chép ghi nhật ký.'],
          ['Ảnh tải lên', 'Nhận diện loại theo byte đầu file (JPG/PNG/WebP), đặt đuôi theo loại thật, tên file UUID; không tin tên file/content-type do trình duyệt gửi. ≤ 5 MB/ảnh, ≤ 25 MB/request.'],
          ['Khác', 'Lỗi 500 không trả stack trace; JPQL dùng tham số; frontend không dùng innerHTML. Mật khẩu admin ban đầu: dev Admin@123, stage/prod lấy từ ADMIN_INITIAL_PASSWORD (thiếu thì không khởi động).'],
        ],
      },
    },
    { h: '3. Tác vụ nền' },
    {
      table: {
        cols: [{ h: 'Tác vụ', w: 6 }, { h: 'Chu kỳ', w: 4 }, { h: 'Việc làm', w: 22 }],
        rows: [
          ['OrderStatusScheduler.run → OrderLifecycleService.advanceStatuses', 'Mỗi 60 giây (bắt đầu 1 phút sau khi khởi động)', 'Đơn khách tự check-in (SELF): Đã đặt → Đang ở khi tới giờ nhận (giờ nhận thực tế = giờ hẹn); Đang ở → Chờ xác nhận trả khi tới giờ trả. Đơn nhân viên đón (STAFF): Đang ở → Quá giờ khi tới giờ trả; quá giờ nhận mà khách chưa tới vẫn giữ Đã đặt. Ghi nhật ký STATUS_AUTO, người = system.'],
          ['OrderStatusScheduler.run → OrderExtensionService.releaseMovedOutRooms', 'Mỗi 60 giây', 'Đơn đã chuyển phòng khi gia hạn: chặng cũ đã kết thúc → phòng cũ sang Chờ dọn (needs_cleaning = 1) đúng 1 lần (order_stay.cleaning_requested = 1).'],
          ['Frontend: Tổng quan, Lịch đặt phòng, chuông thông báo', 'Mỗi 1 phút', 'Tự tải lại dữ liệu (không cần bấm làm mới).'],
        ],
      },
    },
    { h: '4. Vòng đời trạng thái đơn' },
    { note: '* = tác vụ nền tự chuyển. Gia hạn luôn đưa đơn về Đang ở; nếu giờ trả mới vẫn đã qua thì tác vụ nền chuyển lại.' },
    { diagram: 'orderStatus' },
    {
      table: {
        cols: [{ h: 'Thao tác', w: 5 }, { h: 'Trạng thái được phép', w: 9 }, { h: 'API', w: 7 }, { h: 'Kết quả', w: 11 }],
        rows: [
          ['Nhận phòng', 'Đã đặt', 'POST /orders/{id}/check-in', 'Đang ở, ghi giờ nhận thực tế = bây giờ'],
          ['Trả phòng', 'Đang ở, Quá giờ, Chờ xác nhận trả', 'POST /orders/{id}/checkout', 'Đã trả; cộng phụ thu quá giờ + thêm tay; tự thêm khoản thu số còn lại; phòng Chờ dọn'],
          ['Gia hạn', 'Đang ở, Quá giờ, Chờ xác nhận trả', 'POST /orders/{id}/extend', 'Đang ở; dời giờ trả, thêm dòng phí "Gia hạn +N giờ/ngày", có thể thêm chặng ở phòng mới'],
          ['Huỷ', 'Đã đặt, Đang ở, Chờ xác nhận trả (chỉ đơn khách tự check-in)', 'POST /orders/{id}/cancel', 'Đã huỷ; ghi số hoàn, lý do; khung giờ trống lại ngay'],
          ['Sửa đơn', 'Đã đặt', 'PUT /orders/{id}', 'Tính lại giá theo bảng giá hiện hành, kiểm tra trùng lịch'],
          ['Thu / sửa / xoá tiền', 'Mọi trạng thái trừ Đã trả, Đã huỷ', 'POST|PUT|DELETE /orders/{id}/payments', 'Cập nhật Đã thu / Còn phải thu; tổng đã thu không vượt tổng tiền'],
        ],
      },
    },
    { h: '5. Nhật ký thao tác (activity_log.action)' },
    {
      table: {
        cols: [{ h: 'action', w: 7 }, { h: 'Khi nào ghi', w: 15 }, { h: 'Nơi ghi', w: 10 }],
        rows: [
          ['ORDER_CREATED / ORDER_UPDATED', 'Tạo / sửa đơn', 'OrderService'],
          ['CHECK_IN / CHECK_OUT', 'Nhận phòng / trả phòng (kể cả xác nhận trả)', 'OrderLifecycleService'],
          ['PAYMENT_ADDED / PAYMENT_UPDATED / PAYMENT_DELETED', 'Thu thêm / sửa / xoá khoản thu', 'OrderPaymentService'],
          ['ORDER_CANCELLED', 'Huỷ đơn (kèm số hoàn, lý do)', 'OrderLifecycleService'],
          ['ORDER_EXTENDED', 'Gia hạn, chuyển phòng', 'OrderExtensionService'],
          ['STATUS_AUTO', 'Tác vụ nền tự chuyển trạng thái (người = system, hiện "Hệ thống")', 'OrderLifecycleService'],
          ['ROOM_CLEANED', 'Đánh dấu phòng Đã dọn', 'RoomService'],
          ['DOOR_CODE_VIEWED / DOOR_CODE_COPIED', 'Xem mã cửa / sao chép tin nhắn có {ma_cua} (đơn được tính là "đã gửi mã")', 'OrderService'],
          ['ACCOUNT_CREATED / ACCOUNT_UPDATED', 'Thêm / sửa tài khoản (kèm khoá/mở, đổi vai trò, đặt lại mật khẩu)', 'AccountManagementService'],
        ],
      },
    },
    { note: 'Không ghi nhật ký khi sửa cấu hình (phòng, bảng giá, phụ thu, cài đặt, lịch làm) — các bảng này vẫn có created/updated by. Nhật ký ghi cùng transaction với thao tác (lỗi thì không ghi).' },
    { h: '6. Danh sách API' },
    {
      table: {
        cols: [{ h: 'STT', w: 1 }, { h: 'Method', w: 2 }, { h: 'URL (sau /api)', w: 8 }, { h: 'Quyền', w: 7 }, { h: 'Mô tả', w: 11 }, { h: 'File màn', w: 3 }],
        rows: API.map((r, i) => [i + 1, ...r]),
      },
    },
  ],
};
