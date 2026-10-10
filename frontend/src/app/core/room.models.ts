/** Cách tính giá của một phòng. */
export type RoomPricingMode = 'ROOM_TYPE' | 'OWN';

/** Hình thức check-in mặc định của một phòng. */
export type CheckInMode = 'SELF' | 'STAFF';

/** Hạng phòng kèm danh sách số phòng thuộc hạng. */
export interface RoomTypeDto {
  id: number;
  name: string;
  twoHourPrice: number;
  extraHourPrice: number;
  overnightPrice: number;
  dailyPrice: number;
  roomNumbers: string[];
}

/** Khung giờ áp dụng chung cho mọi hạng phòng. Giờ dạng "HH:mm" hoặc "HH:mm:ss". */
export interface PricingSettingsDto {
  minHours: number;
  overnightCheckIn: string;
  overnightCheckOut: string;
  dailyCheckIn: string;
  dailyCheckOut: string;
}

/** Dữ liệu cho tab Bảng giá và dialog Sửa bảng giá. */
export interface PricingOverview {
  roomTypes: RoomTypeDto[];
  /** Hạng phòng đã ẩn (xoá mềm), giữ lại để khôi phục. */
  hiddenRoomTypes: RoomTypeDto[];
  settings: PricingSettingsDto;
}

/** Một dòng hạng phòng gửi lên khi lưu bảng giá; id null nghĩa là hạng mới. */
export interface RoomTypeUpsertItem {
  id: number | null;
  name: string;
  twoHourPrice: number;
  extraHourPrice: number;
  overnightPrice: number;
  dailyPrice: number;
}

/** Dữ liệu lưu từ dialog Sửa bảng giá. */
export interface PricingOverviewUpdateRequest {
  roomTypes: RoomTypeUpsertItem[];
  settings: PricingSettingsDto;
}

/** Một ảnh phòng. */
export interface RoomPhotoDto {
  id: number;
  url: string;
  cover: boolean;
}

/** Thông tin đầy đủ một phòng. */
export interface RoomDto {
  id: number;
  roomNumber: string;
  name: string;
  floor: number | null;
  roomTypeId: number;
  roomTypeName: string;
  maxGuests: number;
  bedConfig: string | null;
  description: string | null;
  pricingMode: RoomPricingMode;
  ownTwoHourPrice: number | null;
  ownExtraHourPrice: number | null;
  ownOvernightPrice: number | null;
  ownDailyPrice: number | null;
  effectiveTwoHourPrice: number;
  effectiveExtraHourPrice: number;
  effectiveOvernightPrice: number;
  effectiveDailyPrice: number;
  defaultCheckInMode: CheckInMode;
  checkInGuide: string | null;
  acceptingBookings: boolean;
  photos: RoomPhotoDto[];
}

/** Dữ liệu thêm/sửa phòng. */
export interface RoomUpsertRequest {
  roomNumber: string;
  name: string;
  floor: number | null;
  roomTypeId: number;
  maxGuests: number;
  bedConfig: string | null;
  description: string | null;
  pricingMode: RoomPricingMode;
  ownTwoHourPrice: number | null;
  ownExtraHourPrice: number | null;
  ownOvernightPrice: number | null;
  ownDailyPrice: number | null;
  defaultCheckInMode: CheckInMode;
  checkInGuide: string | null;
  acceptingBookings: boolean;
}
