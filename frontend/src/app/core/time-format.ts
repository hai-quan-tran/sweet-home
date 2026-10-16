/** Tên thứ đầy đủ theo `Date.getDay()`. */
export const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
/** Tên thứ rút gọn theo `Date.getDay()`. */
export const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** "HH:mm" của giờ dạng "YYYY-MM-DDTHH:mm:ss". */
export function hm(iso: string): string {
  return iso.slice(11, 16);
}

/** "dd/MM" của ngày/giờ dạng ISO. */
export function dm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Giờ "HH:mm" nếu cùng ngày với now, khác ngày thì "dd/MM HH:mm". */
export function timeOf(iso: string, now: string): string {
  return iso.slice(0, 10) === now.slice(0, 10) ? hm(iso) : `${dm(iso)} ${hm(iso)}`;
}

/** Số phút từ a đến b (giờ ISO địa phương). */
export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

/** Khoảng thời gian dạng "50 phút", "2 giờ 10 phút", "3 ngày". */
export function durationLabel(minutes: number): string {
  const m = Math.max(0, minutes);
  if (m < 60) {
    return `${m} phút`;
  }
  const h = Math.floor(m / 60);
  if (h >= 24) {
    return `${Math.floor(h / 24)} ngày`;
  }
  return m % 60 ? `${h} giờ ${m % 60} phút` : `${h} giờ`;
}
