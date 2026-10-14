import { CheckInMode } from './room.models';

export type OrderStatus = 'BOOKED' | 'CHECKED_IN' | 'OVERSTAY' | 'PENDING_CHECKOUT' | 'CHECKED_OUT' | 'CANCELLED';
export type RentalType = 'HOURLY' | 'OVERNIGHT' | 'DAILY';
export type OrderSource = 'ZALO' | 'FACEBOOK' | 'PHONE' | 'REGULAR' | 'OTHER';
export type PaymentMethod = 'TRANSFER' | 'CASH';

/** Một dòng phụ thu đã cộng vào đơn. */
export interface OrderSurchargeDto {
  name: string;
  amount: number;
}

/** Một khoản thu thêm của đơn (ngoài cọc). */
export interface OrderPaymentDto {
  id: number;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
}

/** Dữ liệu thêm/sửa một khoản thu. */
export interface OrderPaymentRequest {
  amount: number;
  method: PaymentMethod;
  note: string | null;
}

/** Thông tin đầy đủ một đơn thuê. */
export interface OrderDto {
  id: number;
  code: string;
  status: OrderStatus;
  roomId: number;
  roomNumber: string;
  roomName: string;
  roomTypeNameSnapshot: string;
  rentalType: RentalType;
  checkInAt: string;
  checkOutAt: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  cancelledAt: string | null;
  refundAmount: number | null;
  cancelReason: string | null;
  guestName: string;
  guestPhone: string;
  guestIdNumberMasked: string | null;
  guestCount: number;
  source: OrderSource;
  note: string | null;
  checkInMode: CheckInMode;
  hasDoorCode: boolean;
  deposit: number;
  depositMethod: PaymentMethod | null;
  discount: number;
  discountReason: string | null;
  roomPriceAmount: number;
  surcharges: OrderSurchargeDto[];
  totalAmount: number;
  payments: OrderPaymentDto[];
  paidAmount: number;
  dueAmount: number;
  /** Các chặng của đơn (nhiều chặng khi gia hạn có chuyển phòng). */
  stays: { roomNumber: string; roomName: string; startAt: string; endAt: string }[];
}

/** Dữ liệu tạo đơn thuê. */
export interface OrderUpsertRequest {
  roomId: number;
  rentalType: RentalType;
  checkInDate: string;
  checkInTime: string | null;
  quantity: number | null;
  guestName: string;
  guestPhone: string;
  guestIdNumber: string | null;
  guestCount: number;
  source: OrderSource;
  note: string | null;
  checkInMode: CheckInMode;
  doorCode: string | null;
  deposit: number;
  depositMethod: PaymentMethod;
  discount: number;
  discountReason: string | null;
}

/** Dữ liệu "xem trước" trong lúc điền form Tạo đơn. */
export interface OrderPreviewRequest {
  roomId: number;
  rentalType: RentalType;
  checkInDate: string;
  checkInTime: string | null;
  quantity: number | null;
  guestCount: number;
  discount: number;
  deposit: number;
  excludeOrderId: number | null;
}

/** Kết quả xem trước: lịch tự tính, phòng có trống không, tiền tạm tính. */
export interface OrderPreviewResponse {
  checkInAt: string;
  checkOutAt: string;
  available: boolean;
  conflictMessage: string | null;
  roomPriceAmount: number;
  surcharges: OrderSurchargeDto[];
  totalAmount: number;
  dueAmount: number;
}

/** Một trang danh sách đơn kèm số lượng theo từng trạng thái cho các tab lọc. */
export interface OrderListResponse {
  items: OrderDto[];
  total: number;
  countByStatus: Record<OrderStatus, number>;
}

/** Mã cửa đã giải mã của một đơn. */
export interface DoorCodeResponse {
  doorCode: string | null;
}

/** Dữ liệu trả phòng (dùng cả cho xem trước). */
export interface CheckoutRequest {
  actualCheckInAt: string;
  actualCheckOutAt: string;
  manualSurchargeIds: number[];
  paymentMethod: PaymentMethod | null;
}

/** Kết quả xem trước khi trả phòng. */
export interface CheckoutPreviewResponse {
  newSurcharges: OrderSurchargeDto[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  manualOptions: { id: number; name: string; amount: number }[];
}

/** Mức hoàn cọc app tự tính nếu huỷ ngay bây giờ. */
export interface CancelPreviewResponse {
  refundPercent: number;
  defaultRefundAmount: number;
  paidAmount: number;
}

/** Dữ liệu huỷ đơn. */
export interface CancelRequest {
  refundAmount: number;
  reason: string | null;
}

/** Một chặng hiển thị trên lịch đặt phòng. */
export interface OrderStayDto {
  orderId: number;
  code: string;
  roomId: number;
  status: OrderStatus;
  rentalType: RentalType;
  checkInMode: CheckInMode;
  guestName: string;
  startAt: string;
  endAt: string;
}

export type ExtendType = 'HOUR' | 'DAY';

/** Dữ liệu gia hạn (dùng cả cho xem trước). */
export interface ExtendRequest {
  type: ExtendType;
  quantity: number;
  collectNow: boolean;
  paymentMethod: PaymentMethod | null;
  /** Phòng chuyển khách sang khi không giữ được phòng đang ở; null = gia hạn tại phòng. */
  targetRoomId: number | null;
}

/** Kết quả xem trước gia hạn tại phòng đang ở. */
export interface ExtendPreviewResponse {
  hourPrice: number;
  dayPrice: number;
  currentCheckOutAt: string;
  newCheckOutAt: string;
  fee: number;
  nextOrder: { code: string; guestName: string; checkInAt: string } | null;
  maxCheckOutAt: string | null;
  maxExtraHours: number | null;
  available: boolean;
  /** Phòng cùng giá, đã dọn, trống suốt thời gian gia hạn (chỉ có khi không gia hạn được tại phòng). */
  moveOptions: { roomId: number; roomNumber: string; roomName: string; maxGuests: number; freeUntil: string | null }[];
}
