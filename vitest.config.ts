import { defineConfig } from 'vitest/config';

// 只跑 test/unit 下的單元測試（純邏輯，node 環境）；e2e 由 Playwright 負責。
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.{js,ts}'],
    environment: 'node',
  },
});
