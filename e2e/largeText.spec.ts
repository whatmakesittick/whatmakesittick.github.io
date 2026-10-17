import type { Page } from '@playwright/test';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { openAbout, openCatalogue, openExplainer } from './driver.ts';
import { expect, test } from './fixtures.ts';
import { hasHorizontalOverflow, tallerThanButtons } from './probes.ts';
import { discoverExplainers } from './site.ts';

const ACCESSIBILITY_TEXT_SIZE = '235%';
const LONG_WORD_LANGUAGES: readonly LanguageCode[] = [DEFAULT_LANGUAGE, 'de', 'uk'];
const SITE_LANGUAGES = LANGUAGES.map(({ code }) => code).filter((code) =>
  LONG_WORD_LANGUAGES.includes(code),
);

async function expectFitsText(page: Page): Promise<void> {
  expect.soft(await hasHorizontalOverflow(page), 'horizontal overflow').toBe(false);
  expect.soft(await tallerThanButtons(page), 'text taller than its button').toEqual([]);
}

test.skip(({ isMobile }) => !isMobile, 'large system text is a phone setting');

test.beforeEach(async ({ page }) => {
  await page.addInitScript((size) => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.fontSize = size;
    });
  }, ACCESSIBILITY_TEXT_SIZE);
});

for (const language of SITE_LANGUAGES) {
  test(`catalogue with large text (${language})`, async ({ page }) => {
    await openCatalogue(page, language);
    await expectFitsText(page);
  });

  test(`about with large text (${language})`, async ({ page }) => {
    await openAbout(page, language);
    await expectFitsText(page);
  });
}

for (const { slug, locales } of discoverExplainers()) {
  for (const language of locales.filter((code) => LONG_WORD_LANGUAGES.includes(code))) {
    test(`${slug} with large text (${language})`, async ({ page }) => {
      await openExplainer(page, slug, language);
      await expectFitsText(page);
    });
  }
}
