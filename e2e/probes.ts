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
const DOCK_PARTS =
  '[data-dock] :is(button, input, select, label:not(.visually-hidden), .field-value-number, .segmented)';
const DOCK_MORE = '[data-dock] [data-control="more"]';

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

export function dockCollisions(page: Page): Promise<string[]> {
  return page.$$eval(DOCK_PARTS, (parts) => {
    const dock = parts[0]?.closest('[data-dock]')?.getBoundingClientRect();
    const shown = parts.filter((part) => part.checkVisibility());
    const name = (part: Element) =>
      `${part.tagName.toLowerCase()} "${part.textContent?.trim() ?? ''}"`;
    const crossing = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const clipped = shown
      .filter((part) => part.tagName !== 'INPUT' && part.scrollWidth > part.clientWidth + 1)
      .map((part) => `clipped ${name(part)}`);
    const outside = shown
      .map((part) => [part, part.getBoundingClientRect()] as const)
      .filter(([, box]) => dock && (box.left < dock.left || box.right > dock.right))
      .map(([part]) => `outside ${name(part)}`);
    const overlaps = shown.flatMap((a, index) =>
      shown
        .slice(index + 1)
        .filter((b) => !a.contains(b) && !b.contains(a))
        .filter((b) => crossing(a.getBoundingClientRect(), b.getBoundingClientRect()))
        .map((b) => `${name(a)} over ${name(b)}`),
    );
    return [...clipped, ...outside, ...overlaps];
  });
}

export function tallerThanButtons(page: Page): Promise<string[]> {
  return page.$$eval('button', (buttons) =>
    buttons
      .filter((button) => button.checkVisibility())
      .filter((button) => button.scrollHeight > button.clientHeight + 1)
      .map((button) => button.textContent?.trim() ?? ''),
  );
}

export async function openDockExtras(page: Page): Promise<void> {
  const more = page.locator(DOCK_MORE);
  if (!(await more.isVisible())) return;
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
}
