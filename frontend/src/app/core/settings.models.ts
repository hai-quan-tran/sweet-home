import { CheckInMode } from './room.models';

/** Thông tin homestay, dùng chèn vào mẫu tin nhắn gửi khách. */
export interface HomestayInfoDto {
  name: string;
  hotline: string;
  address: string;
  mapLink: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
}

/** Dữ liệu sửa thông tin homestay. */
export type HomestayInfoUpdateRequest = HomestayInfoDto;

/** Một mẫu tin nhắn gửi khách. */
export interface MessageTemplateDto {
  id: number;
  name: string;
  body: string;
  /** Hình thức check-in tự chọn sẵn mẫu này khi tạo đơn; null nếu chọn tay. */
  defaultForCheckInMode: CheckInMode | null;
  containsDoorCode: boolean;
}

/** Dữ liệu thêm/sửa mẫu tin nhắn. */
export interface MessageTemplateUpsertRequest {
  name: string;
  body: string;
  defaultForCheckInMode: CheckInMode | null;
}
