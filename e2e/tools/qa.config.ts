import { defineConfig, devices } from '@playwright/test';

const DEV_PORT = process.env.QA_PORT ?? '5180';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const PHONE_DEVICE_SCALE = 1;
const TEST_TIMEOUT_MS = 300_000;
const SOFTWARE_WEBGL_FLAGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: '.',
  testMatch: /explainer-qa\.spec\.ts/,
  timeout: TEST_TIMEOUT_MS,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${DEV_PORT}/`,
    browserName: 'chromium',
    launchOptions: { args: SOFTWARE_WEBGL_FLAGS },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT } },
    {
      name: 'phone',
      use: { ...devices['iPhone 13'], deviceScaleFactor: PHONE_DEVICE_SCALE, hasTouch: true },
    },
  ],
});
