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

/** Độ phủ ca với đơn cần nhân viên đón: theo ngày và danh sách đơn không ai trực lúc nhận phòng. */
export interface CoverageDto {
  days: { date: string; total: number; uncovered: number }[];
  uncovered: { orderId: number; orderCode: string; roomNumber: string; checkInAt: string }[];
  /** Khung ca mẫu của một ngày cần xếp thêm người. */
  needs: { date: string; templateId: number }[];
}
