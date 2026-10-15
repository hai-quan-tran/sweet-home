/** Ca mẫu. Giờ dạng "06:00:00"; giờ kết thúc ≤ giờ bắt đầu = hôm sau. Màu 1–6. */
export interface ShiftTemplateDto {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  color: number;
}

/** Dữ liệu thêm/sửa ca mẫu (giờ "HH:mm"). */
export interface ShiftTemplateRequest {
  name: string;
  startTime: string;
  endTime: string;
  color: number;
}

/** Ca đã xếp: bản sao tên/màu/giờ lúc xếp; color 0 = ca lẻ; `edited` = giờ khác ca mẫu lúc lưu. */
export interface WorkShiftDto {
  id: number;
  accountId: number;
  templateId: number | null;
  name: string;
  color: number;
  startAt: string;
  endAt: string;
  edited: boolean;
  note: string | null;
}

/** Dữ liệu xếp/sửa một ca. `date` = ngày của ca "YYYY-MM-DD"; templateId null = ca lẻ. */
export interface WorkShiftRequest {
  accountId: number;
  date: string;
  templateId: number | null;
  startTime: string;
  endTime: string;
  note: string | null;
}

/** Kết quả sao chép tuần trước. */
export interface CopyWeekResult {
  copied: number;
  skipped: number;
}
