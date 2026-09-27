import { expect, test as base } from '@playwright/test';
import type { ConsoleMessage, Page } from '@playwright/test';

const WEB_FONT_REQUEST = /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//;
const BLOCKED_REQUEST_ERROR = 'net::ERR_FAILED';

function isBlockedFontError(message: ConsoleMessage): boolean {
  return (
    message.text().includes(BLOCKED_REQUEST_ERROR) && WEB_FONT_REQUEST.test(message.location().url)
  );
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error' || isBlockedFontError(message)) return;
    errors.push(`console error: ${message.text()}`);
  });
  return errors;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(WEB_FONT_REQUEST, (route) => route.abort());
    const errors = collectErrors(page);
    await use(page);
    expect(errors, 'page and console errors').toEqual([]);
  },
});

export { expect };
