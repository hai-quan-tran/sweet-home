// Khôi phục DB dev từ out/baseline.sql khi lần chụp trước bị dừng giữa chừng (bình thường capture.mjs tự khôi phục).
import { existsSync, rmSync } from 'node:fs';
import { BASELINE_FILE } from './lib/config.mjs';
import { restore } from './lib/db.mjs';

if (!existsSync(BASELINE_FILE)) {
  console.log('Không có out/baseline.sql — DB đã ở baseline.');
} else {
  restore(BASELINE_FILE);
  rmSync(BASELINE_FILE);
  console.log('Đã khôi phục DB dev về baseline. Ảnh phòng mẫu (nếu còn) xoá tay trong backend/data/room-photos.');
}
