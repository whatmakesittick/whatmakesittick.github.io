import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';

const PREVIEW_PORT = 4180;
const BASE_URL = `http://localhost:${PREVIEW_PORT}/`;
const IS_CI = Boolean(process.env.CI);
const TEST_TIMEOUT_MS = 300_000;
const REPORTERS: ReporterDescription[] = [
  ['list'],
  ...(IS_CI ? [['github'] as const] : []),
  ['html', { open: 'never' }],
];
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const PHONE_DEVICE_SCALE = 1;
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
  reporter: REPORTERS,
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
      use: { ...devices['iPhone 13'], deviceScaleFactor: PHONE_DEVICE_SCALE },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PREVIEW_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
  },
});
