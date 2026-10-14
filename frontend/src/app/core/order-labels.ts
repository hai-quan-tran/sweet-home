import { OrderSource, OrderStatus, PaymentMethod, RentalType } from './order.models';
import { CheckInMode } from './room.models';

/** Nhãn + class màu tag theo trạng thái đơn (class định nghĩa ở styles.scss). */
export const STATUS_TAG: Record<OrderStatus, { label: string; cls: string }> = {
  BOOKED: { label: 'Đã đặt', cls: 't-b' },
  CHECKED_IN: { label: 'Đang ở', cls: 't-i' },
  OVERSTAY: { label: 'Quá giờ', cls: 't-w' },
  PENDING_CHECKOUT: { label: 'Chờ xác nhận', cls: 't-p' },
  CHECKED_OUT: { label: 'Đã trả', cls: 't-o' },
  CANCELLED: { label: 'Đã huỷ', cls: 't-c' },
};

export const RENTAL_TYPE_LABEL: Record<RentalType, string> = { HOURLY: 'Theo giờ', OVERNIGHT: 'Qua đêm', DAILY: 'Theo ngày' };
export const CHECK_IN_MODE_LABEL: Record<CheckInMode, string> = { SELF: 'tự nhận', STAFF: 'NV đón' };
export const SOURCE_LABEL: Record<OrderSource, string> = {
  ZALO: 'Zalo', FACEBOOK: 'Facebook', PHONE: 'Gọi điện', REGULAR: 'Khách quen', OTHER: 'Khác',
};
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { TRANSFER: 'chuyển khoản', CASH: 'tiền mặt' };
