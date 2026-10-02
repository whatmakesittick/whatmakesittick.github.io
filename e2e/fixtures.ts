import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ANALYTICS } from '../vite/site.ts';

const EMPTY_SCRIPT = { status: 200, contentType: 'application/javascript', body: '' };

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    errors.push(`console error: ${message.text()}`);
  });
  return errors;
}

async function stubVisitCounter(page: Page): Promise<void> {
  await page.route(ANALYTICS.script, (route) => route.fulfill(EMPTY_SCRIPT));
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = collectErrors(page);
    await stubVisitCounter(page);
    await use(page);
    expect(errors, 'page and console errors').toEqual([]);
  },
});

export { expect };
