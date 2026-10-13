import { OrderDto } from './order.models';
import { HomestayInfoDto } from './settings.models';
import { buildOrderMessageContext, renderMessageTemplate } from './message-template';

const order: OrderDto = {
  id: 36,
  code: 'SH-1036',
  status: 'BOOKED',
  roomId: 1,
  roomNumber: '101',
  roomName: 'Mộc',
  roomTypeNameSnapshot: 'Tiêu chuẩn',
  rentalType: 'OVERNIGHT',
  checkInAt: '2026-10-07T21:00:00',
  checkOutAt: '2026-10-08T12:00:00',
  guestName: 'Phạm Quốc Bảo',
  guestPhone: '0903112457',
  guestIdNumberMasked: null,
  guestCount: 2,
  source: 'ZALO',
  note: null,
  checkInMode: 'SELF',
  hasDoorCode: true,
  deposit: 0,
  depositMethod: null,
  discount: 0,
  discountReason: null,
  roomPriceAmount: 350000,
  surcharges: [],
  totalAmount: 350000,
  payments: [],
  paidAmount: 0,
  dueAmount: 350000,
};

const homestay: HomestayInfoDto = {
  name: 'Sweet Home',
  hotline: '0909123456',
  address: '25 Trần Hưng Đạo',
  mapLink: 'https://maps.app.goo.gl/sweethome',
  wifiName: 'SweetHome_5G',
  wifiPassword: 'sweethome2026',
};

describe('renderMessageTemplate', () => {
  it('thay các biến {xxx} bằng giá trị tương ứng', () => {
    const context = buildOrderMessageContext(order, homestay, 'Đi thang bộ lên tầng 1.', '482915');

    const result = renderMessageTemplate('Chào {ten_khach}, mã cửa là {ma_cua}. Wifi: {wifi}', context);

    expect(result).toBe('Chào Phạm Quốc Bảo, mã cửa là 482915. Wifi: SweetHome_5G');
  });

  it('giữ nguyên biến không nhận diện được', () => {
    const context = buildOrderMessageContext(order, homestay, null, null);

    const result = renderMessageTemplate('{khong_ton_tai}', context);

    expect(result).toBe('{khong_ton_tai}');
  });

  it('ma_cua rỗng khi chưa lấy mã (null)', () => {
    const context = buildOrderMessageContext(order, homestay, null, null);

    expect(renderMessageTemplate('{ma_cua}', context)).toBe('');
  });

  it('huong_dan lấy từ tham số truyền vào, không phải snapshot', () => {
    const context = buildOrderMessageContext(order, homestay, 'Hướng dẫn hiện tại của phòng', null);

    expect(renderMessageTemplate('{huong_dan}', context)).toBe('Hướng dẫn hiện tại của phòng');
  });

  it('gio_nhan/gio_tra định dạng HH:mm, dd/MM/yyyy', () => {
    const context = buildOrderMessageContext(order, homestay, null, null);

    expect(context.gio_nhan).toBe('21:00, 07/10/2026');
    expect(context.gio_tra).toBe('12:00, 08/10/2026');
  });
});
