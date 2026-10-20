import { formatMoney } from './money';
import { HomestayInfoDto } from './settings.models';
import { OrderDto } from './order.models';

/** Dữ liệu điền vào các biến {xxx} của mẫu tin nhắn. */
export interface MessageTemplateContext {
  ten_khach: string;
  ma_don: string;
  phong: string;
  loai_thue: string;
  gio_nhan: string;
  gio_tra: string;
  so_khach: string;
  tong_tien: string;
  da_coc: string;
  con_phai_thu: string;
  ma_cua: string;
  huong_dan: string;
  ten_homestay: string;
  dia_chi: string;
  ban_do: string;
  hotline: string;
  wifi: string;
  mat_khau_wifi: string;
}

const RENTAL_TYPE_LABEL: Record<OrderDto['rentalType'], string> = {
  HOURLY: 'theo giờ',
  OVERNIGHT: 'qua đêm',
  DAILY: 'theo ngày',
};

/** Định dạng "HH:mm, dd/MM/yyyy" từ chuỗi ISO datetime. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Dựng dữ liệu các biến từ đơn + thông tin homestay + hướng dẫn phòng (lấy hiện hành, không lưu
 * snapshot trong đơn) + mã cửa đã giải mã (null nếu chưa lấy/không có).
 */
export function buildOrderMessageContext(
  order: OrderDto,
  homestay: HomestayInfoDto,
  roomGuide: string | null,
  doorCode: string | null,
): MessageTemplateContext {
  return {
    ten_khach: order.guestName,
    ma_don: order.code,
    phong: `${order.roomNumber} · ${order.roomName}`,
    loai_thue: RENTAL_TYPE_LABEL[order.rentalType],
    gio_nhan: formatDateTime(order.checkInAt),
    gio_tra: formatDateTime(order.checkOutAt),
    so_khach: String(order.guestCount),
    tong_tien: formatMoney(order.totalAmount),
    da_coc: formatMoney(order.deposit),
    con_phai_thu: formatMoney(order.dueAmount),
    ma_cua: doorCode ?? '',
    huong_dan: roomGuide ?? '',
    ...homestayVariables(homestay),
  };
}

/** Các biến lấy từ thông tin homestay. */
function homestayVariables(homestay: HomestayInfoDto) {
  return {
    ten_homestay: homestay.name,
    dia_chi: homestay.address,
    ban_do: homestay.mapLink ?? '',
    hotline: homestay.hotline,
    wifi: homestay.wifiName ?? '',
    mat_khau_wifi: homestay.wifiPassword ?? '',
  };
}

/** Mã đơn mẫu hiện ở tiêu đề phần xem trước. */
export const SAMPLE_ORDER_CODE = 'SH-1036';

/**
 * Dữ liệu biến của một đơn mẫu cố định (không phải đơn thật) + thông tin homestay hiện tại, dùng xem trước mẫu
 * tin nhắn ở màn Cài đặt — không gọi API đơn, không lấy mã cửa thật.
 *
 * @param homestay thông tin homestay đã lưu
 * @param doorCode giá trị đặt vào {ma_cua} (giá trị đánh dấu để hiện dạng che)
 */
export function buildSampleMessageContext(homestay: HomestayInfoDto, doorCode: string): MessageTemplateContext {
  return {
    ten_khach: 'Phạm Quốc Bảo',
    ma_don: SAMPLE_ORDER_CODE,
    phong: '101 · Mộc',
    loai_thue: RENTAL_TYPE_LABEL.OVERNIGHT,
    gio_nhan: '21:00, 07/10/2026',
    gio_tra: '12:00, 08/10/2026',
    so_khach: '2',
    tong_tien: formatMoney(450000),
    da_coc: formatMoney(100000),
    con_phai_thu: formatMoney(350000),
    ma_cua: doorCode,
    huong_dan: 'Đi thang bộ lên tầng 1, phòng đầu hành lang bên phải. Nhập mã cửa trên khoá số rồi nhấn #.',
    ...homestayVariables(homestay),
  };
}

/** Thay các biến dạng {ten_bien} trong nội dung mẫu bằng giá trị tương ứng trong context. */
export function renderMessageTemplate(body: string, context: MessageTemplateContext): string {
  return body.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in context ? context[key as keyof MessageTemplateContext] : match,
  );
}
