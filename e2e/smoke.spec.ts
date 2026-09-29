import type { Locator, Page } from '@playwright/test';
import {
  openAbout,
  openCatalogue,
  openExplainer,
  scrubTo,
  showChapter,
  visibleChapters,
} from './driver.ts';
import { expect, test } from './fixtures.ts';
import { boxesIntersect } from './geometry.ts';
import type { SceneLabel } from './geometry.ts';
import { dockBox, emptyReadouts, hasHorizontalOverflow, untranslatedCopy } from './probes.ts';
import { CATALOGUE_SECOND_LANGUAGE, discoverExplainers } from './site.ts';

const EXPLAINERS = discoverExplainers();
const EXPLAINER_SLUGS = EXPLAINERS.map(({ slug }) => slug).toSorted();
const SCRUBBER_STOP = 0.5;
const PERCENT = 100;
const NON_BLANK = /\S/;
const TOUCH_MEDIA_QUERIES = ['(pointer: coarse)', '(hover: none)'];

async function expectNamedPage(page: Page): Promise<void> {
  await expect(page).toHaveTitle(NON_BLANK);
  await expect(page.locator('h1')).toHaveText(NON_BLANK);
}

async function expectTranslatedCopy(page: Page): Promise<void> {
  expect.soft(await untranslatedCopy(page), 'untranslated or empty copy').toEqual([]);
}

async function expectFitsWidth(page: Page): Promise<void> {
  expect.soft(await hasHorizontalOverflow(page), 'horizontal overflow').toBe(false);
}

async function expectFilledReadouts(page: Page): Promise<void> {
  expect.soft(await emptyReadouts(page), 'empty readouts').toEqual([]);
}

async function expectExplainerIntact(page: Page): Promise<void> {
  await expectTranslatedCopy(page);
  await expectFitsWidth(page);
  await expectFilledReadouts(page);
}

async function expectLabelsClearOfDock(page: Page, labels: SceneLabel[]): Promise<void> {
  const dock = await dockBox(page);
  const overDock = labels.filter(({ box }) => boxesIntersect(box, dock)).map(({ text }) => text);
  expect.soft(overDock, 'scene labels over the dock').toEqual([]);
}

async function linkedSlug(page: Page, card: Locator): Promise<string> {
  const href = (await card.getAttribute('href')) ?? '';
  return new URL(href, page.url()).pathname.split('/').filter(Boolean).at(-1) ?? href;
}

async function expectCoverLoaded(card: Locator): Promise<void> {
  await card.scrollIntoViewIfNeeded();
  const cover = card.locator('img');
  await expect
    .poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth), {
      message: `cover of ${await card.getAttribute('href')} loads`,
    })
    .toBeGreaterThan(0);
}

async function expectCataloguePage(page: Page, cards: Locator): Promise<void> {
  await expectNamedPage(page);
  await expectTranslatedCopy(page);
  await expectFitsWidth(page);

  const linked: string[] = [];
  for (const card of await cards.all()) {
    linked.push(await linkedSlug(page, card));
    await expectCoverLoaded(card);
  }
  expect(linked.toSorted(), 'every card links to an explainer').toEqual(EXPLAINER_SLUGS);
}

test('the phone project emulates a touch screen', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'touch screens only');
  const matches = await page.evaluate(
    (queries) => queries.map((query) => matchMedia(query).matches),
    TOUCH_MEDIA_QUERIES,
  );
  expect(matches).toEqual(TOUCH_MEDIA_QUERIES.map(() => true));
});

for (const { slug, secondLanguage } of EXPLAINERS) {
  test(slug, async ({ page }) => {
    await openExplainer(page, slug);
    await expectNamedPage(page);
    await expectExplainerIntact(page);

    for (const chapter of await visibleChapters(page)) {
      const preset = await chapter.getAttribute('data-preset');
      await test.step(`chapter ${preset}`, async () => {
        await expectLabelsClearOfDock(page, await showChapter(page, chapter));
        await expectExplainerIntact(page);
      });
    }

    await test.step(`scrubber at ${SCRUBBER_STOP * PERCENT}%`, async () => {
      await expectLabelsClearOfDock(page, await scrubTo(page, SCRUBBER_STOP));
      await expectFilledReadouts(page);
    });
  });

  if (!secondLanguage) continue;

  test(`${slug} (${secondLanguage})`, async ({ page }) => {
    await openExplainer(page, slug, secondLanguage);
    await expectNamedPage(page);
    await expectExplainerIntact(page);
  });
}

const QUERY_LINK_EXPLAINER = EXPLAINERS.find(({ secondLanguage }) => secondLanguage);

if (QUERY_LINK_EXPLAINER?.secondLanguage) {
  const { slug, secondLanguage } = QUERY_LINK_EXPLAINER;
  test(`${slug} (?lang=${secondLanguage})`, async ({ page }) => {
    await openExplainer(page, slug, secondLanguage, 'query');
    await expectNamedPage(page);
    await expectTranslatedCopy(page);
  });
}

async function expectAboutPage(page: Page): Promise<void> {
  await expectNamedPage(page);
  await expectTranslatedCopy(page);
  await expectFitsWidth(page);
  await expect(page.locator('main p').first()).toHaveText(NON_BLANK);
}

test('about', async ({ page }) => {
  await openAbout(page);
  await expectAboutPage(page);
});

if (CATALOGUE_SECOND_LANGUAGE) {
  const language = CATALOGUE_SECOND_LANGUAGE;
  test(`about (${language})`, async ({ page }) => {
    await openAbout(page, language);
    await expectAboutPage(page);
  });
}

test('catalogue', async ({ page }) => {
  await expectCataloguePage(page, await openCatalogue(page));
});

if (CATALOGUE_SECOND_LANGUAGE) {
  const language = CATALOGUE_SECOND_LANGUAGE;
  test(`catalogue (${language})`, async ({ page }) => {
    await expectCataloguePage(page, await openCatalogue(page, language));
  });
}
