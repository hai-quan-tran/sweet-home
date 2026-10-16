import { defineConfig } from 'vitest/config';

// Cấu hình thêm cho Vitest (angular.json → test.runnerConfig). Lần dựng p-dialog đầu tiên của mỗi file test có thể mất
// hơn 5 giây (mặc định) khi chạy cả bộ song song trên máy đang tải, nên nới thời gian chờ mỗi test.
export default defineConfig({
  test: {
    testTimeout: 15_000,
  },
});
