import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  outputDir: '../../../test-results/mcp-widget',
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://localhost:5183',
    viewport: { width: 900, height: 1200 },
  },
  webServer: {
    command: 'npm run dev:widget',
    url: 'http://localhost:5183/dev.html',
    reuseExistingServer: true,
    cwd: '../../..',
  },
});
