import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { LANGUAGE_QUERY_KEY, languagePath } from '../src/core/i18n/paths.ts';
import { CAMERA_TWEEN_SECONDS, MAX_FRAME_SECONDS } from '../src/core/scene/constants.ts';
import { labelsAgree } from './geometry.ts';
import type { SceneLabel } from './geometry.ts';
import { visibleSceneLabels, waitForSceneTime } from './probes.ts';
import type { SceneTimeWait } from './probes.ts';

const CHAPTER = 'section.chapter[data-preset]';
const ACTIVE_CHAPTER_CLASS = 'is-active';
const PLAY_BUTTON = '[data-control="play"]';
const PLAYING_ATTRIBUTE = 'data-playing';
const PLAYING = 'true';
const PAUSED = 'false';
const SCRUBBER = '[data-control="scrubber"]';
const SCENE_CANVAS = '#scene canvas';
const CARD = '.card';
const MILLISECONDS_PER_SECOND = 1000;
const MAX_FRAME_MS = MAX_FRAME_SECONDS * MILLISECONDS_PER_SECOND;
const CAMERA_WAIT_LIMIT_MS = 10_000;
const LABEL_SAMPLE_FRAMES = 2;
const LABEL_SAMPLE_LIMIT_MS = 3_000;
const LABEL_SETTLE_LIMIT_MS = 5_000;
const CAMERA_TWEEN: SceneTimeWait = {
  sceneMilliseconds: CAMERA_TWEEN_SECONDS * MILLISECONDS_PER_SECOND + MAX_FRAME_MS,
  maxFrameMilliseconds: MAX_FRAME_MS,
  limitMilliseconds: CAMERA_WAIT_LIMIT_MS,
};
const LABEL_SAMPLE_GAP: SceneTimeWait = {
  sceneMilliseconds: LABEL_SAMPLE_FRAMES * MAX_FRAME_MS,
  maxFrameMilliseconds: MAX_FRAME_MS,
  limitMilliseconds: LABEL_SAMPLE_LIMIT_MS,
};
const LABEL_TOLERANCE_PX = 2;
const WARNING = 'warning';

export type LanguageLink = 'page' | 'query';

function pageUrl(page: string, language: LanguageCode, link: LanguageLink): string {
  if (link === 'page') return `/${languagePath(language, page)}`;
  const query = new URLSearchParams({ [LANGUAGE_QUERY_KEY]: language });
  return `/${languagePath(DEFAULT_LANGUAGE, page)}?${query}`;
}

async function expectLanguage(page: Page, language: LanguageCode): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

async function visit(
  page: Page,
  path: string,
  language: LanguageCode,
  link: LanguageLink,
): Promise<void> {
  await page.goto(pageUrl(path, language, link), { waitUntil: 'networkidle' });
  await expectLanguage(page, language);
}

export async function openExplainer(
  page: Page,
  slug: string,
  language: LanguageCode = DEFAULT_LANGUAGE,
  link: LanguageLink = 'page',
): Promise<void> {
  await visit(page, slug, language, link);
  await expect(page.locator(SCENE_CANVAS)).toBeAttached();
}

export async function openCatalogue(
  page: Page,
  language: LanguageCode = DEFAULT_LANGUAGE,
): Promise<Locator> {
  await visit(page, '', language, 'page');
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

function warn(description: string): void {
  test.info().annotations.push({ type: WARNING, description });
  console.warn(`${test.info().title}: ${description}`);
}

async function waitForCamera(page: Page, context: string): Promise<void> {
  if (await waitForSceneTime(page, CAMERA_TWEEN)) return;
  warn(`${context}: the camera tween had not finished after ${CAMERA_WAIT_LIMIT_MS} ms`);
}

async function sampleLabels(page: Page): Promise<SceneLabel[]> {
  await waitForSceneTime(page, LABEL_SAMPLE_GAP);
  return visibleSceneLabels(page);
}

async function settledLabels(page: Page, context: string): Promise<SceneLabel[]> {
  const deadline = Date.now() + LABEL_SETTLE_LIMIT_MS;
  let previous = await sampleLabels(page);
  let current = await sampleLabels(page);
  while (!labelsAgree(previous, current, LABEL_TOLERANCE_PX) && Date.now() < deadline) {
    previous = current;
    current = await sampleLabels(page);
  }
  if (!labelsAgree(previous, current, LABEL_TOLERANCE_PX)) {
    warn(`${context}: scene labels still moved after ${LABEL_SETTLE_LIMIT_MS} ms`);
  }
  return current;
}

export async function showChapter(page: Page, chapter: Locator): Promise<SceneLabel[]> {
  const context = `chapter ${await chapter.getAttribute('data-preset')}`;
  await chapter.evaluate((section) =>
    section.scrollIntoView({ block: 'start', behavior: 'instant' }),
  );
  await expect(chapter).toContainClass(ACTIVE_CHAPTER_CLASS);
  await pausePlayback(page);
  await expect(chapter).toContainClass(ACTIVE_CHAPTER_CLASS);
  await waitForCamera(page, context);
  return settledLabels(page, context);
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
  return settledLabels(page, `scrubber at ${fraction}`);
}
