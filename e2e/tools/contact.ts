import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [, , dir, outFile, prefix = ''] = process.argv;
const SHEET_VIEWPORT = { width: 1800, height: 1200 };
const COLUMNS = 3;
const SETTLE_MS = 500;

if (!dir || !outFile) {
  throw new Error('usage: node e2e/tools/contact.ts <screenshot dir> <out.png> [name prefix]');
}

const files = readdirSync(dir)
  .filter((name) => name.endsWith('.png') && name.startsWith(prefix))
  .sort();

function cell(name: string): string {
  const data = readFileSync(`${dir}/${name}`).toString('base64');
  return `<figure><img src="data:image/png;base64,${data}"><figcaption>${name}</figcaption></figure>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; background: #111; color: #ddd; font: 12px system-ui }
main { display: grid; grid-template-columns: repeat(${COLUMNS}, 1fr); gap: 8px; padding: 8px }
figure { margin: 0 }
img { width: 100%; display: block; border: 1px solid #333 }
figcaption { padding: 2px 0 }
</style></head><body><main>${files.map(cell).join('')}</main></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: SHEET_VIEWPORT });
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(SETTLE_MS);
await page.screenshot({ path: outFile, fullPage: true });
console.log(`saved ${outFile} with ${files.length} screenshots`);
await browser.close();
