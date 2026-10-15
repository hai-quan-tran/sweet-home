/** Một dòng nhật ký thao tác. `actor` = "system" là Hệ thống (tác vụ tự động). */
export interface ActivityLogDto {
  id: number;
  createdAt: string;
  actor: string;
  actorName: string | null;
  action: string;
  detail: string;
  orderId: number | null;
  orderCode: string | null;
  roomNumber: string | null;
}

/** Một trang nhật ký. */
export interface ActivityLogPage {
  items: ActivityLogDto[];
  total: number;
}

/** Khoảng thời gian lọc nhật ký. */
export type ActivityPeriod = 'today' | 'week' | 'month';

/** Tên đăng nhập dùng cho tác vụ tự động. */
export const SYSTEM_ACTOR = 'system';
