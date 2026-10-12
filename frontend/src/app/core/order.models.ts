import { CheckInMode } from './room.models';

export type OrderStatus = 'BOOKED' | 'CHECKED_IN' | 'OVERSTAY' | 'PENDING_CHECKOUT' | 'CHECKED_OUT' | 'CANCELLED';
export type RentalType = 'HOURLY' | 'OVERNIGHT' | 'DAILY';
export type OrderSource = 'ZALO' | 'FACEBOOK' | 'PHONE' | 'REGULAR' | 'OTHER';
export type DepositMethod = 'TRANSFER' | 'CASH';

/** Một dòng phụ thu đã cộng vào đơn. */
export interface OrderSurchargeDto {
  name: string;
  amount: number;
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
  guestName: string;
  guestPhone: string;
  guestIdNumberMasked: string | null;
  guestCount: number;
  source: OrderSource;
  note: string | null;
  checkInMode: CheckInMode;
  hasDoorCode: boolean;
  deposit: number;
  depositMethod: DepositMethod | null;
  discount: number;
  discountReason: string | null;
  roomPriceAmount: number;
  surcharges: OrderSurchargeDto[];
  totalAmount: number;
  dueAmount: number;
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
  depositMethod: DepositMethod | null;
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
