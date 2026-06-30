import { defineConfig } from '@playwright/test';

// 冒煙/回歸測試：先 build 再 preview，於正確的 base 路徑驗證。
// 本機用環境內預裝的 Chromium；CI 用 playwright 自行安裝的 chromium。
const localChrome = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  // 部署形式＝直接靜態檔（原生 ES module、相對路徑），故測試也用原始檔靜態伺服器，與 GitHub Pages 一致。
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://localhost:4173/',
    launchOptions: {
      // CI：用 playwright 內建 chromium（executablePath 留空）；本機：用 /opt 預裝。
      executablePath: process.env.CI ? undefined : (process.env.PW_CHROME || localChrome),
    },
  },
});
