// Tạo dữ liệu mẫu qua API cho ảnh chụp tài liệu: bảng giá, phòng, phụ thu, cài đặt, nhân viên, lịch làm, đơn ở mọi trạng thái.
// Mốc thời gian tính theo lúc chạy để màn Tổng quan, Lịch, thông báo luôn có dữ liệu "hôm nay".
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Api } from './lib/api.mjs';
import { sql } from './lib/db.mjs';
import { addDays, addHours, hm, ldt, mondayOf, startOfDay, startOfHour, ymd } from './lib/time.mjs';

/** Tài khoản Quản lý tạm dùng để chụp (tạo thẳng trong DB vì không biết mật khẩu admin), xoá khi khôi phục baseline. */
export const DOC_MANAGER = { username: 'docs_quanly', fullName: 'Nguyễn Minh Anh' };

/** @returns {string} mật khẩu ngẫu nhiên đúng quy tắc (≥ 8 ký tự, có chữ và số) */
const randomPassword = () => 'Doc' + randomBytes(6).toString('hex') + '9';

/**
 * Tạo tài khoản Quản lý tạm trong DB (mật khẩu ngẫu nhiên mỗi lần chạy).
 * @returns {{username: string, password: string}}
 */
function createDocManager() {
  const password = randomPassword();
  const hash = bcrypt.hashSync(password, 10);
  sql(`INSERT INTO account (username, password_hash, full_name, role, status, must_change_password, phone, start_date, created_at)
       VALUES ('${DOC_MANAGER.username}', '${hash}', '${DOC_MANAGER.fullName}', 'MANAGER', 'ACTIVE', 0, '0903 111 222',
               DATE_SUB(CURDATE(), INTERVAL 400 DAY), NOW(3))`);
  return { username: DOC_MANAGER.username, password };
}

/**
 * Tạo toàn bộ dữ liệu mẫu.
 * @param {{photo: (label: string, hue: number) => Promise<Buffer>}} helpers sinh ảnh phòng giả (PNG)
 * @returns {Promise<object>} ngữ cảnh cho các bước chụp: tài khoản, id phòng/đơn/phụ thu theo khoá
 */
export async function seed({ photo }) {
  const now = new Date();
  const H = startOfHour(now);
  const today = startOfDay(now);
  const manager = createDocManager();
  const api = new Api();
  await api.login(manager.username, manager.password);

  // Bảng giá: 3 hạng phòng, giữ nguyên khung giờ chung đang có
  const { settings } = await api.get('/room-types/overview');
  const pricing = await api.put('/room-types/overview', {
    settings,
    roomTypes: [
      { name: 'Tiêu chuẩn', twoHourPrice: 150000, extraHourPrice: 50000, overnightPrice: 350000, dailyPrice: 500000 },
      { name: 'Deluxe', twoHourPrice: 200000, extraHourPrice: 70000, overnightPrice: 450000, dailyPrice: 650000 },
      { name: 'Gia đình', twoHourPrice: 300000, extraHourPrice: 90000, overnightPrice: 600000, dailyPrice: 900000 },
    ],
  });
  const type = Object.fromEntries(pricing.roomTypes.map((t) => [t.name, t.id]));

  // Phòng
  const guideSelf =
    'Cửa chính mở bằng mã cửa gửi trong tin nhắn. Lên cầu thang bên phải, phòng ở cuối hành lang. Thẻ điện cắm ở khe cạnh cửa.';
  const roomDefs = [
    ['101', 'Phòng Hoa Nhài', 1, 'Tiêu chuẩn', 2, '1 giường đôi', 'STAFF', 'Nhân viên đón ở sảnh tầng 1.'],
    ['102', 'Phòng Hoa Sen', 1, 'Tiêu chuẩn', 2, '1 giường đôi', 'STAFF', 'Nhân viên đón ở sảnh tầng 1.'],
    ['103', 'Phòng Hoa Mai', 1, 'Tiêu chuẩn', 2, '1 giường đôi', 'SELF', guideSelf],
    ['104', 'Phòng Hoa Cúc', 1, 'Tiêu chuẩn', 2, '2 giường đơn', 'SELF', guideSelf],
    ['201', 'Phòng Biển Xanh', 2, 'Deluxe', 2, '1 giường king', 'STAFF', 'Nhân viên đón ở sảnh tầng 1.'],
    ['202', 'Phòng Hoàng Hôn', 2, 'Deluxe', 3, '1 giường đôi + 1 sofa bed', 'SELF', guideSelf],
    ['301', 'Căn Gia Đình', 3, 'Gia đình', 4, '2 giường đôi', 'SELF', guideSelf],
  ];
  const room = {};
  for (const [roomNumber, name, floor, t, maxGuests, bedConfig, mode, checkInGuide] of roomDefs) {
    const r = await api.post('/rooms', {
      roomNumber, name, floor, roomTypeId: type[t], maxGuests, bedConfig,
      description: `${name} rộng rãi, có cửa sổ, máy lạnh, TV, bàn làm việc.`,
      pricingMode: 'ROOM_TYPE', defaultCheckInMode: mode, checkInGuide, acceptingBookings: true,
    });
    room[roomNumber] = r.id;
  }
  // Phòng giá riêng, đang tắt nhận đặt (sửa chữa)
  room['302'] = (await api.post('/rooms', {
    roomNumber: '302', name: 'Phòng Gác Mái', floor: 3, roomTypeId: type['Deluxe'], maxGuests: 2, bedConfig: '1 giường đôi',
    description: 'Phòng áp mái, trần gỗ, đang sửa máy lạnh.', pricingMode: 'OWN',
    ownTwoHourPrice: 180000, ownExtraHourPrice: 60000, ownOvernightPrice: 400000, ownDailyPrice: 600000,
    defaultCheckInMode: 'SELF', checkInGuide: guideSelf, acceptingBookings: false,
  })).id;
  for (const [no, hues] of [['101', [205, 160, 30]], ['201', [190, 220]]]) {
    const form = new FormData();
    for (const [i, hue] of hues.entries()) {
      form.append('files', new Blob([await photo(`Phòng ${no} · ảnh ${i + 1}`, hue)], { type: 'image/png' }), `p${i}.png`);
    }
    await api.post(`/rooms/${room[no]}/photos`, form);
  }

  // Phụ thu
  const allTypes = Object.values(type);
  const sc = {};
  const addSurcharge = async (key, body) => (sc[key] = (await api.post('/surcharges', { roomTypeIds: allTypes, ...body })).id);
  await addSurcharge('overstay', { name: 'Quá giờ trả phòng', whenType: 'OVERSTAY', graceMinutes: 15 });
  await addSurcharge('extraGuest', { name: 'Vượt số khách', whenType: 'EXTRA_GUEST', amount: 100000 });
  await addSurcharge('weekend', { name: 'Cuối tuần', whenType: 'WEEKDAY', amount: 10, weekdays: ['SATURDAY', 'SUNDAY'] });
  const year = now.getFullYear() + 1;
  await addSurcharge('holiday', {
    name: 'Lễ, Tết', whenType: 'DATE_RANGE', amount: 20,
    dateRanges: [
      { name: 'Tết Dương lịch', fromDate: `${year}-01-01`, toDate: `${year}-01-01` },
      { name: 'Tết Nguyên đán', fromDate: `${year}-02-05`, toDate: `${year}-02-10` },
    ],
  });
  await addSurcharge('birthday', { name: 'Trang trí sinh nhật', whenType: 'MANUAL', amount: 200000 });
  await addSurcharge('laundry', { name: 'Giặt ủi', whenType: 'MANUAL', amount: 50000 });
  await api.patch(`/surcharges/${sc.laundry}/active`, { active: false });

  // Cài đặt: thông tin homestay, mẫu tin nhắn
  await api.put('/settings/homestay', {
    name: 'Sweet Home', hotline: '0909 123 456', address: '25 Hoa Sữa, Phường 7, Phú Nhuận, TP. Hồ Chí Minh',
    mapLink: 'https://maps.example.com/sweet-home', wifiName: 'SweetHome_5G', wifiPassword: 'sweet2026',
  });
  await api.post('/message-templates', {
    name: 'Hướng dẫn tự check-in', defaultForCheckInMode: 'SELF',
    body: 'Chào {ten_khach}, Sweet Home xác nhận đơn {ma_don}:\n- Phòng {phong}, {loai_thue}\n- Nhận phòng: {gio_nhan}\n- Trả phòng: {gio_tra}\n- Đã cọc {da_coc}, còn phải thu {con_phai_thu}\n\nĐịa chỉ: {dia_chi} ({ban_do})\nMã cửa: {ma_cua}\n{huong_dan}\nWifi: {wifi} / {mat_khau_wifi}\nCần hỗ trợ gọi {hotline}.',
  });
  await api.post('/message-templates', {
    name: 'Xác nhận - nhân viên đón', defaultForCheckInMode: 'STAFF',
    body: 'Chào {ten_khach}, Sweet Home xác nhận đơn {ma_don}: phòng {phong}, nhận {gio_nhan}, trả {gio_tra}, {so_khach} khách.\nTổng tiền {tong_tien}, đã cọc {da_coc}.\nNhân viên sẽ đón anh/chị tại {dia_chi}. Hotline: {hotline}.',
  });
  await api.post('/message-templates', {
    name: 'Nhắc thanh toán', defaultForCheckInMode: null,
    body: 'Chào {ten_khach}, đơn {ma_don} còn phải thu {con_phai_thu}. Anh/chị vui lòng thanh toán khi trả phòng. Cảm ơn!',
  });

  // Nhân viên
  const acc = {};
  const pw = {};
  const addAccount = async (key, body) => {
    pw[key] = randomPassword();
    acc[key] = (await api.post('/accounts', { role: 'STAFF', active: true, mustChangePassword: false, password: pw[key], ...body })).id;
  };
  await addAccount('ha', { username: 'nv_ha', fullName: 'Trần Thu Hà', phone: '0912 345 678', idNumber: '079201001234', startDate: ymd(addDays(today, -300)) });
  await addAccount('nam', { username: 'nv_nam', fullName: 'Lê Văn Nam', phone: '0987 654 321', idNumber: '079099004567', startDate: ymd(addDays(today, -90)) });
  await addAccount('tuan', { username: 'nv_tuan', fullName: 'Phạm Anh Tuấn', phone: '0938 222 333', startDate: ymd(addDays(today, -200)), active: false });
  await addAccount('lan', { username: 'nv_lan', fullName: 'Võ Thị Lan', phone: '0977 111 999', startDate: ymd(addDays(today, 2)), mustChangePassword: true });
  const managerId = Number(sql(`SELECT id FROM account WHERE username = '${DOC_MANAGER.username}'`));

  // Lịch làm tuần này: Hà ca sáng, Nam ca chiều (hôm nay Nam trực ca chứa giờ hiện tại); ca đêm để trống
  const templates = await api.get('/shift-templates');
  const tpl = Object.fromEntries(templates.map((t) => [t.name, t]));
  const shift = (accountId, date, t, body = {}) =>
    api.post('/shifts', { accountId, date: ymd(date), templateId: t.id, startTime: t.startTime, endTime: t.endTime, ...body });
  const monday = mondayOf(now);
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (d.getTime() !== today.getTime()) {
      await shift(acc.ha, d, tpl['Sáng']);
      if (i % 2 === 0) await shift(acc.nam, d, tpl['Chiều']);
      else await shift(acc.nam, d, tpl['Chiều'], { startTime: '15:00', note: 'Xin vào trễ 1 tiếng' });
    }
  }
  const hourNow = now.getHours();
  const current = templates.find((t) => {
    const s = +t.startTime.slice(0, 2), e = +t.endTime.slice(0, 2);
    return s < e ? hourNow >= s && hourNow < e : hourNow >= s || hourNow < e;
  });
  await shift(acc.nam, hourNow < +current.startTime.slice(0, 2) ? addDays(today, -1) : today, current);
  const helpFrom = addHours(H, -7);
  await api.post('/shifts', {
    accountId: acc.ha, date: ymd(helpFrom), startTime: hm(helpFrom), endTime: hm(addHours(H, -1)), note: 'Ca lẻ hỗ trợ dọn phòng',
  });
  await api.post('/shifts', { accountId: managerId, date: ymd(addDays(monday, 5)), startTime: '09:00', endTime: '12:00', note: 'Kiểm kê' });

  // Đơn thuê
  const base = (no, t, mode, guest, extra = {}) => ({
    roomId: room[no], rentalType: 'HOURLY', checkInDate: ymd(t), checkInTime: hm(t), quantity: 2, guestCount: 2,
    source: 'ZALO', checkInMode: mode, doorCode: mode === 'SELF' ? '482916' : null, deposit: 100000, depositMethod: 'TRANSFER',
    discount: 0, ...guest, ...extra,
  });
  const order = {};
  const create = async (key, body, client = api) => (order[key] = (await client.post('/orders', body)).id);
  const guest = (guestName, guestPhone, guestIdNumber) => ({ guestName, guestPhone, guestIdNumber });

  // Đơn đã trả các ngày trước (biểu đồ doanh thu 7 ngày, nhật ký), dọn phòng xong
  const pastRooms = ['101', '102', '103', '104', '201', '202'];
  const pastGuests = [
    guest('Hoàng Văn Sơn', '0901 234 001'), guest('Ngô Thị Thu', '0901 234 002'), guest('Bùi Quang Vinh', '0901 234 003'),
    guest('Đặng Mỹ Duyên', '0901 234 004'), guest('Trịnh Công Lý', '0901 234 005'), guest('Lý Thanh Hằng', '0901 234 006'),
  ];
  for (let d = 1; d <= 6; d++) {
    const t = addHours(startOfDay(addDays(now, -d)), 10);
    const no = pastRooms[d - 1];
    const id = await create('past' + d, base(no, t, 'STAFF', pastGuests[d - 1], { quantity: 2 + (d % 3), source: d % 2 ? 'FACEBOOK' : 'PHONE' }));
    await api.post(`/orders/${id}/check-in`);
    await api.post(`/orders/${id}/checkout`, {
      actualCheckInAt: ldt(t), actualCheckOutAt: ldt(addHours(t, 2 + (d % 3))), manualSurchargeIds: [], paymentMethod: 'CASH',
    });
  }
  for (const no of pastRooms) await api.post(`/rooms/${room[no]}/cleaned`);

  // Hôm nay: đang ở, quá giờ, chờ xác nhận trả, đã trả (phòng chờ dọn)
  await create('staying', base('101', addHours(H, -2), 'STAFF', guest('Nguyễn Thị Mai', '0903 456 789', '079300012345'), { quantity: 3 }));
  await api.post(`/orders/${order.staying}/check-in`);
  await api.post(`/orders/${order.staying}/payments`, { amount: 50000, method: 'CASH', note: 'Thu thêm khi nhận phòng' });
  await create('overstay', base('102', addHours(H, -4), 'STAFF', guest('Trần Văn Bình', '0915 222 444')));
  await api.post(`/orders/${order.overstay}/check-in`);
  await create('pending', base('103', addHours(H, -5), 'SELF', guest('Lê Hoàng Phúc', '0938 777 888'), { quantity: 3, source: 'FACEBOOK' }));
  await create('checkedOut', base('201', addHours(H, -6), 'STAFF', guest('Phạm Gia Huy', '0966 123 123'), { quantity: 3, source: 'PHONE' }));
  await api.post(`/orders/${order.checkedOut}/check-in`);
  await api.post(`/orders/${order.checkedOut}/checkout`, {
    actualCheckInAt: ldt(addHours(H, -6)), actualCheckOutAt: ldt(addHours(H, -3)), manualSurchargeIds: [sc.birthday], paymentMethod: 'TRANSFER',
  });

  // Sắp tới: đơn khách tự check-in trong 2 giờ tới (do nhân viên tạo), đơn kế tiếp phòng 101, đơn ngày mai
  const staff = new Api();
  await staff.login('nv_ha', pw.ha);
  await create('upcoming', base('202', addHours(H, 1), 'SELF', guest('Đỗ Khánh Linh', '0909 888 222', '001302009876'), { quantity: 3 }), staff);
  await create('next101', base('101', addHours(H, 3), 'STAFF', guest('Châu Ngọc Trâm', '0934 567 890'), { source: 'REGULAR' }), staff);
  const tomorrow = addDays(today, 1);
  await create('family', base('301', tomorrow, 'SELF', guest('Võ Đăng Khoa', '0918 246 135', '079095003344'), {
    rentalType: 'DAILY', checkInTime: null, quantity: 2, guestCount: 5, source: 'FACEBOOK', deposit: 500000,
    discount: 50000, discountReason: 'Khách quen', note: 'Khách đi cùng 2 trẻ nhỏ, cần thêm gối.',
  }));
  await create('overnight', base('202', tomorrow, 'STAFF', guest('Vũ Minh Tâm', '0906 135 246'), {
    rentalType: 'OVERNIGHT', checkInTime: null, quantity: null, deposit: 200000, depositMethod: 'CASH',
  }));
  await create('cancelled', base('104', addHours(tomorrow, 10), 'SELF', guest('Kiều Anh Thư', '0911 000 555'), { source: 'OTHER' }));
  const cancelPreview = await api.get(`/orders/${order.cancelled}/cancel/preview`);
  await api.post(`/orders/${order.cancelled}/cancel`, { refundAmount: cancelPreview.defaultRefundAmount, reason: 'Khách đổi lịch' });

  await waitForStatuses(api, { [order.overstay]: 'OVERSTAY', [order.pending]: 'PENDING_CHECKOUT' });
  return { now, manager, staffLogin: { username: 'nv_ha', password: pw.ha }, newStaffLogin: { username: 'nv_lan', password: pw.lan }, room, type, sc, acc, managerId, order, api };
}

/**
 * Chờ tác vụ nền (mỗi phút) tự chuyển trạng thái các đơn quá giờ / chờ xác nhận trả.
 * @param {Api} api client đã đăng nhập
 * @param {Record<number, string>} expected id đơn → trạng thái cần đạt
 */
async function waitForStatuses(api, expected) {
  const deadline = Date.now() + 180_000;
  for (;;) {
    const statuses = await Promise.all(Object.keys(expected).map(async (id) => (await api.get(`/orders/${id}`)).status));
    if (statuses.every((s, i) => s === Object.values(expected)[i])) return;
    if (Date.now() > deadline) throw new Error('Tác vụ nền chưa chuyển trạng thái đơn: ' + statuses.join(', '));
    await new Promise((r) => setTimeout(r, 5000));
  }
}
