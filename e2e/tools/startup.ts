import { chromium } from '@playwright/test';

const [, , baseUrl, ...slugs] = process.argv;
const MAX_TASK_MS = 200;
const CPU_SLOWDOWN = 4;
const SETTLE_MS = 8_000;
const GPU_FLAGS = ['--ignore-gpu-blocklist', '--enable-gpu'];
const PHONE = {
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

if (!baseUrl || slugs.length === 0) {
  throw new Error('usage: node e2e/tools/startup.ts <base url> <slug>...');
}

interface TaskLog {
  startupTasks: number[];
}

function recordLongTasks(): void {
  const log = window as unknown as TaskLog;
  log.startupTasks = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) log.startupTasks.push(Math.round(entry.duration));
  }).observe({ type: 'longtask', buffered: true });
}

async function longestTask(slug: string): Promise<number> {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await page.addInitScript(recordLongTasks);
  await page.goto(new URL(`${slug}/`, baseUrl).href, { waitUntil: 'load' });
  await page.waitForTimeout(SETTLE_MS);
  const tasks = await page.evaluate(() => (window as unknown as TaskLog).startupTasks);
  await context.close();
  return Math.max(0, ...tasks);
}

const browser = await chromium.launch({ args: GPU_FLAGS });
let slow = false;
for (const slug of slugs) {
  const ms = await longestTask(slug);
  slow ||= ms > MAX_TASK_MS;
  console.log(
    `${ms > MAX_TASK_MS ? 'slow' : 'ok'}  ${slug}: longest task ${ms} ms, limit ${MAX_TASK_MS}`,
  );
}
await browser.close();
if (slow) process.exitCode = 1;
