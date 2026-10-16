import { RentalType } from './order.models';
import { CheckInMode } from './room.models';

export type RoomState = 'EMPTY' | 'CLEANING' | 'CHECKED_IN' | 'OVERSTAY' | 'PENDING_CHECKOUT';
export type TaskKind = 'CONFIRM_CHECKOUT' | 'OVERSTAY' | 'CHECK_IN' | 'CHECK_OUT';

/** Tình trạng một phòng; các trường đơn đang ở null khi phòng không có khách. */
export interface RoomCard {
  roomId: number;
  roomNumber: string;
  roomName: string;
  state: RoomState;
  acceptingBookings: boolean;
  checkInMode: CheckInMode;
  orderId: number | null;
  guestName: string | null;
  rentalType: RentalType | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  nextGuestName: string | null;
  nextCheckInAt: string | null;
}

/** Một việc chưa xong hôm nay. */
export interface DashboardTask {
  kind: TaskKind;
  orderId: number;
  orderCode: string;
  at: string;
  guestName: string;
  roomNumber: string;
  checkInMode: CheckInMode;
  staffName: string | null;
  dueAmount: number;
  doorCodeSent: boolean | null;
}

/** Doanh thu một ngày theo ngày nhận phòng. */
export interface DayRevenue {
  date: string;
  revenue: number;
  paid: number;
}

/** Dữ liệu màn Tổng quan; revenue null với Nhân viên. */
export interface DashboardDto {
  now: string;
  onShift: { fullName: string; shiftName: string }[];
  rooms: RoomCard[];
  checkInsToday: number;
  checkedInToday: number;
  tasks: DashboardTask[];
  revenue: DayRevenue[] | null;
  monthOrders: Record<RentalType, number>;
  occupancyPercent: number;
}
