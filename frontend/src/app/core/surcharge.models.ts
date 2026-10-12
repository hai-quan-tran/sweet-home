/** Điều kiện áp dụng phụ thu. Mỗi loại gắn với đúng một đơn vị tính cố định. */
export type SurchargeWhenType = 'OVERSTAY' | 'EXTRA_GUEST' | 'WEEKDAY' | 'DATE_RANGE' | 'MANUAL';

/** Thứ trong tuần, đúng tên enum `java.time.DayOfWeek` phía backend. */
export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/** Một khoảng ngày (ví dụ "Tết Nguyên đán") của phụ thu kiểu DATE_RANGE. */
export interface SurchargeDateRangeDto {
  id: number | null;
  name: string;
  fromDate: string;
  toDate: string;
}

/** Thông tin đầy đủ một phụ thu. */
export interface SurchargeDto {
  id: number;
  name: string;
  whenType: SurchargeWhenType;
  /** % (WEEKDAY, DATE_RANGE) hoặc số tiền (EXTRA_GUEST, MANUAL); null nếu OVERSTAY. */
  amount: number | null;
  /** Phút ân hạn; chỉ có giá trị khi whenType = OVERSTAY. */
  graceMinutes: number | null;
  /** Các ngày trong tuần áp dụng; chỉ có giá trị khi whenType = WEEKDAY. */
  weekdays: Weekday[];
  /** Các khoảng ngày áp dụng; chỉ có giá trị khi whenType = DATE_RANGE. */
  dateRanges: SurchargeDateRangeDto[];
  roomTypeIds: number[];
  roomTypeNames: string[];
  active: boolean;
}

/** Một khoảng ngày gửi lên khi lưu phụ thu kiểu DATE_RANGE. */
export interface SurchargeDateRangeRequest {
  name: string;
  fromDate: string;
  toDate: string;
}

/** Dữ liệu thêm/sửa phụ thu. */
export interface SurchargeUpsertRequest {
  name: string;
  whenType: SurchargeWhenType;
  amount: number | null;
  graceMinutes: number | null;
  weekdays: Weekday[] | null;
  dateRanges: SurchargeDateRangeRequest[] | null;
  roomTypeIds: number[];
}
