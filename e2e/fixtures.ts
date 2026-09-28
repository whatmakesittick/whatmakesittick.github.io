import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    errors.push(`console error: ${message.text()}`);
  });
  return errors;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = collectErrors(page);
    await use(page);
    expect(errors, 'page and console errors').toEqual([]);
  },
});

export { expect };
