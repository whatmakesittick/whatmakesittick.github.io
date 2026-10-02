import { chromium } from '@playwright/test';

const [, , slug, phaseArg, outFile] = process.argv;
const DEV_PORT = process.env.QA_PORT ?? '5180';
const VIEWPORT = { width: 1600, height: 900 };
const DEVICE_SCALE = 2;
const COVER_ASPECT = 4 / 3;
const SETTLE_MS = 4000;
const HIDDEN_CHROME = '[data-gauge], .scene-label, [data-dock], .stage-expand { display: none }';
const SOFTWARE_WEBGL_FLAGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

if (!slug || !phaseArg || !outFile) {
  throw new Error('usage: node e2e/tools/cover.ts <slug> <phase> <out.png>');
}

const browser = await chromium.launch({ args: SOFTWARE_WEBGL_FLAGS });
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
page.on('pageerror', (error) => console.error('pageerror', error.message));
await page.goto(`http://localhost:${DEV_PORT}/${slug}/`, { waitUntil: 'networkidle' });
await page.waitForSelector('#scene canvas');
const play = page.locator('[data-control="play"]');
if ((await play.getAttribute('data-playing')) === 'true') await play.click();
await page.locator('[data-control="scrubber"]').fill(phaseArg);
await page.addStyleTag({ content: HIDDEN_CHROME });
await page.waitForTimeout(SETTLE_MS);
const box = await page.locator('#scene').boundingBox();
if (!box) throw new Error('the stage has no box');
const width = box.width;
const height = width / COVER_ASPECT;
await page.screenshot({
  path: outFile,
  clip: { x: box.x, y: box.y + (box.height - height) / 2, width, height },
});
console.log(`saved ${outFile} ${Math.round(width)}x${Math.round(height)}`);
await browser.close();
