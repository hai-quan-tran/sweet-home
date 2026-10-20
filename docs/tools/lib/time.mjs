// Định dạng ngày giờ theo giờ máy (Asia/Ho_Chi_Minh) đúng kiểu backend nhận: LocalDate, LocalTime, LocalDateTime.
const pad = (n) => String(n).padStart(2, '0');

/** @returns {string} YYYY-MM-DD */
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** @returns {string} HH:mm */
export const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** @returns {string} YYYY-MM-DDTHH:mm:00 */
export const ldt = (d) => `${ymd(d)}T${hm(d)}:00`;

/**
 * Cộng giờ / ngày vào mốc thời gian.
 * @param {Date} d mốc
 * @param {number} hours số giờ (có thể âm)
 * @returns {Date}
 */
export const addHours = (d, hours) => new Date(d.getTime() + hours * 3600_000);

/** @returns {Date} cùng giờ, cộng thêm số ngày (theo lịch, không theo 24 giờ) */
export const addDays = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes());

/** @returns {Date} đầu giờ hiện tại (phút, giây = 0) */
export const startOfHour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());

/** @returns {Date} 00:00 của ngày */
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** @returns {Date} 00:00 thứ Hai của tuần chứa ngày */
export const mondayOf = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
