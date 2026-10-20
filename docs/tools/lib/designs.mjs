// Nạp nội dung các file detail design (content/design/*.mjs), lọc theo tham số --only=01_DangNhap,05_LichDatPhong.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOOLS_DIR } from './config.mjs';

/**
 * @param {string[]} argv tham số dòng lệnh
 * @returns {Promise<object[]>} danh sách nội dung, sắp theo tên file
 */
export async function loadDesigns(argv) {
  const only = argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const dir = join(TOOLS_DIR, 'content', 'design');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.mjs') && (!only || only.some((o) => f.startsWith(o))))
    .sort();
  const designs = [];
  for (const f of files) designs.push((await import(pathToFileURL(join(dir, f)))).default);
  return designs;
}

/**
 * Danh sách mục kèm số thứ tự (theo thứ tự khai báo) và ảnh chứa mục (mặc định ảnh đầu tiên).
 * @param {object} design nội dung một file
 * @returns {object[]}
 */
export function numberedItems(design) {
  return (design.items ?? []).map((item, i) => ({ ...item, no: i + 1, shot: item.shot ?? design.shots?.[0]?.id }));
}
