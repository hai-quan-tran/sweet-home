// Cấu hình chung của công cụ sinh tài liệu: đường dẫn, địa chỉ app đang chạy, kết nối DB dev.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_DIR = resolve(TOOLS_DIR, '../..');
export const OUT_DIR = join(TOOLS_DIR, 'out');
export const SHOTS_DIR = join(OUT_DIR, 'shots');
/** Bản sao lưu DB dev trước khi tạo dữ liệu mẫu; còn file này nghĩa là lần chạy trước chưa khôi phục xong. */
export const BASELINE_FILE = join(OUT_DIR, 'baseline.sql');
export const DIAGRAMS_DIR = join(OUT_DIR, 'diagrams');
export const DESIGN_OUT_DIR = join(ROOT_DIR, 'docs', 'detail-design');
export const PHOTOS_DIR = join(ROOT_DIR, 'backend', 'data', 'room-photos');

export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:4200';
export const API_URL = process.env.API_URL ?? 'http://localhost:8090/api';

/** Chromium có sẵn trong cache Playwright của máy (không tải thêm trình duyệt). */
export const CHROME_PATH =
  process.env.CHROME_PATH ??
  join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');

/** Thư mục chứa mysql/mysqldump; để trống thì lấy theo PATH. */
export const MYSQL_BIN = process.env.MYSQL_BIN ?? 'C:/Program Files/MySQL/MySQL Server 8.0/bin';

/**
 * Đọc thông tin kết nối DB dev từ application-dev.yml của backend (không chép mật khẩu sang đây).
 * @returns {{host: string, port: string, database: string, user: string, password: string}}
 */
export function devDbConfig() {
  const yml = readFileSync(join(ROOT_DIR, 'backend/src/main/resources/application-dev.yml'), 'utf8');
  const [, host, port, database] = yml.match(/url:\s*jdbc:mysql:\/\/([^:/]+):(\d+)\/([^?\s]+)/);
  const user = yml.match(/username:\s*(\S+)/)[1];
  const password = yml.match(/password:\s*(\S+)/)[1];
  return { host: host === 'localhost' ? '127.0.0.1' : host, port, database, user, password };
}
