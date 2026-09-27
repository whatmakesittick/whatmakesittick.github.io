import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { visibleSceneLabels, waitForFrames } from './probes.ts';
import type { FrameWait, SceneLabel } from './probes.ts';

const LANGUAGE_QUERY = 'lang';
const CHAPTER = 'section.chapter[data-preset]';
const ACTIVE_CHAPTER_CLASS = 'is-active';
const PLAY_BUTTON = '[data-control="play"]';
const PLAYING_ATTRIBUTE = 'data-playing';
const PLAYING = 'true';
const PAUSED = 'false';
const SCRUBBER = '[data-control="scrubber"]';
const SCENE_CANVAS = '#scene canvas';
const CARD = '.card';
const LABEL_SAMPLE_GAP: FrameWait = { frames: 2, milliseconds: 300 };
const LABEL_REST_TIMEOUT_MS = 15_000;

function pageUrl(path: string, language: LanguageCode): string {
  return `${path}?${new URLSearchParams({ [LANGUAGE_QUERY]: language })}`;
}

async function expectLanguage(page: Page, language: LanguageCode): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

export async function openExplainer(
  page: Page,
  slug: string,
  language: LanguageCode,
): Promise<void> {
  await page.goto(pageUrl(`/${slug}/`, language));
  await expectLanguage(page, language);
  await expect(page.locator(SCENE_CANVAS)).toBeAttached();
}

export async function openCatalogue(page: Page, language: LanguageCode): Promise<Locator> {
  await page.goto(pageUrl('/', language));
  await expectLanguage(page, language);
  const cards = page.locator(CARD);
  await expect(cards.first()).toBeVisible();
  return cards;
}

export function visibleChapters(page: Page): Promise<Locator[]> {
  return page.locator(CHAPTER).filter({ visible: true }).all();
}

export async function pausePlayback(page: Page): Promise<void> {
  const play = page.locator(PLAY_BUTTON);
  if ((await play.getAttribute(PLAYING_ATTRIBUTE)) === PLAYING) await play.click();
  await expect(play).toHaveAttribute(PLAYING_ATTRIBUTE, PAUSED);
}

async function sampleLabels(page: Page): Promise<SceneLabel[]> {
  await waitForFrames(page, LABEL_SAMPLE_GAP);
  return visibleSceneLabels(page);
}

export async function waitForLabelsToRest(page: Page): Promise<SceneLabel[]> {
  let labels: SceneLabel[] = [];
  let previous = '';
  await expect
    .poll(
      async () => {
        labels = await sampleLabels(page);
        const current = JSON.stringify(labels);
        const resting = current === previous;
        previous = current;
        return resting;
      },
      {
        message: 'scene labels come to rest',
        intervals: [0],
        timeout: LABEL_REST_TIMEOUT_MS,
      },
    )
    .toBe(true);
  return labels;
}

export async function showChapter(page: Page, chapter: Locator): Promise<SceneLabel[]> {
  await chapter.evaluate((section) =>
    section.scrollIntoView({ block: 'start', behavior: 'instant' }),
  );
  await expect(chapter).toContainClass(ACTIVE_CHAPTER_CLASS);
  await pausePlayback(page);
  await expect(chapter).toContainClass(ACTIVE_CHAPTER_CLASS);
  return waitForLabelsToRest(page);
}

async function scrubberValueAt(scrubber: Locator, fraction: number): Promise<number> {
  const { min, max, step } = await scrubber.evaluate((input: HTMLInputElement) => ({
    min: Number(input.min),
    max: Number(input.max),
    step: Number(input.step),
  }));
  return min + Math.round((fraction * (max - min)) / step) * step;
}

export async function scrubTo(page: Page, fraction: number): Promise<SceneLabel[]> {
  const scrubber = page.locator(SCRUBBER);
  await scrubber.fill(String(await scrubberValueAt(scrubber, fraction)));
  await expect(page.locator(PLAY_BUTTON)).toHaveAttribute(PLAYING_ATTRIBUTE, PAUSED);
  return waitForLabelsToRest(page);
}
