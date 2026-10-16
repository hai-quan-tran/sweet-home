export type NotificationKind = 'OVERSTAY' | 'PENDING_CHECKOUT' | 'DOOR_CODE_NOT_SENT' | 'UNCOVERED';

/** Một thông báo (việc cần xử lý); guestName null với loại "không ai trực". */
export interface NotificationItem {
  kind: NotificationKind;
  orderId: number;
  orderCode: string;
  roomNumber: string;
  guestName: string | null;
  at: string;
}

/** Danh sách thông báo tại thời điểm `now` của server. */
export interface NotificationDto {
  now: string;
  items: NotificationItem[];
}
