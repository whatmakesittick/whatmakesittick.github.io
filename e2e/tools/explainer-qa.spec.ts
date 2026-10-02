import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { LanguageCode } from '../../src/core/i18n/languages.ts';
import { openExplainer, scrubTo, showChapter, visibleChapters } from '../driver.ts';
import { boxesIntersect } from '../geometry.ts';
import { dockBox, emptyReadouts, hasHorizontalOverflow, untranslatedCopy } from '../probes.ts';

const SLUG = process.env.SLUG ?? '';
const OUT = process.env.QA_OUT ?? '';
const LANGUAGES = (process.env.QA_LANGUAGES ?? 'en,uk,ja').split(',') as LanguageCode[];
const CHAPTER_COUNT = 6;
const MID_CYCLE = 0.5;
const GAUGE = '[data-gauge]';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console ${message.text()}`);
  });
  return errors;
}

async function gaugeText(page: Page): Promise<string> {
  return (await page.locator(GAUGE).textContent()) ?? '';
}

test.beforeAll(() => {
  if (!SLUG || !OUT) throw new Error('set SLUG and QA_OUT');
});

for (const language of LANGUAGES) {
  test(`${SLUG} walks its chapters in ${language}`, async ({ page }, info) => {
    const errors = collectErrors(page);
    await openExplainer(page, SLUG, language);
    const chapters = await visibleChapters(page);
    expect(chapters.length).toBe(CHAPTER_COUNT);
    const dock = await dockBox(page);
    for (const chapter of chapters) {
      const preset = await chapter.getAttribute('data-preset');
      const labels = await showChapter(page, chapter);
      for (const label of labels) {
        expect(boxesIntersect(label.box, dock), `${preset}: ${label.text} over the dock`).toBe(
          false,
        );
      }
      await page.screenshot({ path: `${OUT}/${language}-${info.project.name}-${preset}.png` });
      expect(await emptyReadouts(page), `${preset}: empty readouts`).toEqual([]);
    }
    expect(await untranslatedCopy(page)).toEqual([]);
    expect(await hasHorizontalOverflow(page)).toBe(false);
    const before = await gaugeText(page);
    await scrubTo(page, MID_CYCLE);
    expect(await gaugeText(page)).not.toBe(before);
    expect(errors).toEqual([]);
  });
}
