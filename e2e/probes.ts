import type { Page } from '@playwright/test';
import type { Box, SceneLabel } from './geometry.ts';

export interface SceneTimeWait {
  sceneMilliseconds: number;
  maxFrameMilliseconds: number;
  limitMilliseconds: number;
}

interface TranslatedText {
  key: string;
  text: string;
}

interface TranslatedAttributes {
  spec: string;
  values: Record<string, string>;
}

const TRANSLATED_TEXT = '[data-i18n], [data-i18n-html]';
const TRANSLATED_ATTRIBUTES = '[data-i18n-attr]';
const PAIR_SEPARATOR = ';';
const KEY_SEPARATOR = ':';
const READOUT_VALUE = '[data-readout] dd';
const SCENE_LABEL = '.scene-label';
const DOCK = '[data-dock]';

function isUntranslated(value: string | undefined, key: string): boolean {
  const shown = value?.trim() ?? '';
  return shown === '' || shown === key;
}

function translatedTexts(page: Page): Promise<TranslatedText[]> {
  return page.$$eval(TRANSLATED_TEXT, (elements) =>
    elements.map((element) => ({
      key: element.dataset.i18n ?? element.dataset.i18nHtml ?? '',
      text: element.textContent ?? '',
    })),
  );
}

function translatedAttributes(page: Page): Promise<TranslatedAttributes[]> {
  return page.$$eval(TRANSLATED_ATTRIBUTES, (elements) =>
    elements.map((element) => ({
      spec: element.dataset.i18nAttr ?? '',
      values: Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value])),
    })),
  );
}

function untranslatedAttributeKeys({ spec, values }: TranslatedAttributes): string[] {
  return spec
    .split(PAIR_SEPARATOR)
    .map((pair) => pair.split(KEY_SEPARATOR).map((part) => part.trim()))
    .filter(([name, key]) => name && key && isUntranslated(values[name], key))
    .map(([name, key]) => `${name}${KEY_SEPARATOR}${key}`);
}

export async function untranslatedCopy(page: Page): Promise<string[]> {
  const texts = (await translatedTexts(page))
    .filter(({ key, text }) => isUntranslated(text, key))
    .map(({ key }) => key);
  const attributes = (await translatedAttributes(page)).flatMap(untranslatedAttributeKeys);
  return [...texts, ...attributes];
}

export function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

export function emptyReadouts(page: Page): Promise<string[]> {
  return page.$$eval(READOUT_VALUE, (values) =>
    values
      .filter((value) => (value.textContent?.trim() ?? '') === '')
      .map((value) => value.closest<HTMLElement>('[data-readout]')?.dataset.readout ?? ''),
  );
}

export function dockBox(page: Page): Promise<Box> {
  return page.locator(DOCK).evaluate((dock) => {
    const { left, top, right, bottom } = dock.getBoundingClientRect();
    return { left, top, right, bottom };
  });
}

export function visibleSceneLabels(page: Page): Promise<SceneLabel[]> {
  return page.$$eval(SCENE_LABEL, (labels) =>
    labels
      .filter((label) => label.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map((label) => {
        const rects = [...label.children].map((part) => part.getBoundingClientRect());
        return {
          text: label.textContent?.trim() ?? '',
          box: {
            left: Math.round(Math.min(...rects.map((rect) => rect.left))),
            top: Math.round(Math.min(...rects.map((rect) => rect.top))),
            right: Math.round(Math.max(...rects.map((rect) => rect.right))),
            bottom: Math.round(Math.max(...rects.map((rect) => rect.bottom))),
          },
        };
      }),
  );
}

export function waitForSceneTime(page: Page, wait: SceneTimeWait): Promise<boolean> {
  return page.evaluate(
    ({ sceneMilliseconds, maxFrameMilliseconds, limitMilliseconds }) =>
      new Promise<boolean>((resolve) => {
        let last = performance.now();
        let elapsed = 0;
        let frame = 0;
        const limit = setTimeout(() => {
          cancelAnimationFrame(frame);
          resolve(false);
        }, limitMilliseconds);
        const tick = (now: number) => {
          elapsed += Math.min(maxFrameMilliseconds, Math.max(0, now - last));
          last = now;
          if (elapsed < sceneMilliseconds) {
            frame = requestAnimationFrame(tick);
            return;
          }
          clearTimeout(limit);
          resolve(true);
        };
        frame = requestAnimationFrame(tick);
      }),
    wait,
  );
}
