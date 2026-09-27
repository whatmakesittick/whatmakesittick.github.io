import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4180;
const BASE_URL = `http://localhost:${PREVIEW_PORT}/`;
const IS_CI = Boolean(process.env.CI);
const TEST_TIMEOUT_MS = 180_000;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
// SwiftShader gives headless chromium a software WebGL context on machines without a GPU.
const SOFTWARE_WEBGL_FLAGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: 'e2e',
  timeout: TEST_TIMEOUT_MS,
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  reporter: [[IS_CI ? 'github' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    launchOptions: { args: SOFTWARE_WEBGL_FLAGS },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'iphone',
      use: devices['iPhone 13'],
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PREVIEW_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
  },
});
