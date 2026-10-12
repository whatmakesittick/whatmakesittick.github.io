import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import { toWidgetCatalogue } from '../../catalogue/build.ts';
import { PATHS } from '../../shared/config.ts';

const engineIn = (lang: Parameters<typeof toWidgetCatalogue>[1]) =>
  toWidgetCatalogue(
    buildCatalogue(resolve(dirname(fileURLToPath(import.meta.url)), '../../..')),
    lang,
  ).explainers.find((e) => e.slug === 'engine')!;

const built = existsSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../..', PATHS.widgetModule),
);

const open = async (page: Page, query: string) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.goto(`/host.html?${query}`);
  return { errors, logs, view: page.frameLocator('iframe') };
};

test.describe('the loader resource', () => {
  test.skip(!built, `${PATHS.widgetModule} is missing (npm run build)`);

  test('loads the widget module and renders the tool input and result', async ({ page }) => {
    const { errors, view } = await open(page, 'slug=engine&chapter=strokes');
    await expect(view.locator('.wmit[data-slug="engine"]')).toBeVisible();
    await expect(view.locator('style[data-wmit-widget]')).toHaveCount(1);
    await expect(view.locator('.a-chapter h3').first()).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('a slow module still gets the handshake, input and result', async ({ page }) => {
    const { errors, logs, view } = await open(page, 'slug=heart&delay=2000');
    await expect(view.locator('.wmit[data-slug="heart"]')).toBeVisible({ timeout: 15_000 });
    expect(logs).toContain('[HOST] initialized');
    expect(errors).toEqual([]);
  });

  test('input and result sent before the module loads are replayed to it', async ({ page }) => {
    const { errors, logs, view } = await open(page, 'slug=heart&delay=2000&early=1');
    await expect
      .poll(() =>
        logs.includes('[HOST] sent tool input and result before the widget module loaded'),
      )
      .toBe(true);
    await expect(view.locator('style[data-wmit-widget]')).toHaveCount(0);
    await expect(view.locator('.wmit[data-slug="heart"]')).toBeVisible({ timeout: 15_000 });
    await expect(view.locator('.a-chapter h3').first()).not.toBeEmpty();
    expect(logs).toContain('[HOST] initialized');
    expect(errors).toEqual([]);
  });

  test('an early tool input with lang opens the widget and the scene in that language', async ({
    page,
  }) => {
    const uk = engineIn('uk');
    const { errors, view } = await open(
      page,
      'slug=engine&chapter=strokes&lang=uk&early=1&delay=600',
    );
    await expect(view.locator('.wmit.st-ready[lang="uk"]')).toBeVisible({ timeout: 15_000 });
    await expect(view.locator('html')).toHaveAttribute('lang', 'uk');
    await expect(view.locator('.a-head .title')).toHaveText(uk.title);
    await expect(view.locator('.a-chapter h3')).toHaveText(
      uk.chapters.find((c) => c.id === 'strokes')!.title,
    );
    await expect(view.getByRole('button', { name: /^(Відтворити|Пауза)/ }).first()).toBeAttached();
    await expect(view.getByRole('button', { name: 'Скинути камеру' }).first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  test('the host locale picks the language when the model passes none', async ({ page }) => {
    const ja = engineIn('ja');
    const { errors, view } = await open(page, 'slug=engine&chapter=strokes&locale=ja-JP');
    await expect(view.locator('.wmit.st-ready[lang="ja"]')).toBeVisible({ timeout: 15_000 });
    await expect(view.locator('.a-chapter h3')).toHaveText(
      ja.chapters.find((c) => c.id === 'strokes')!.title,
    );
    expect(errors).toEqual([]);
  });
});

test('a module that does not load leaves a link to the site and a retry', async ({ page }) => {
  const { logs, view } = await open(page, 'slug=engine&module=missing');
  const fallback = view.locator('.wmit-loader-fallback');
  await expect(fallback).toBeVisible();
  await expect(fallback.getByText('What makes it tick')).toBeVisible();
  await expect
    .poll(() => fallback.getByRole('link').getAttribute('href'))
    .toBe('https://whatmakesittick.github.io/engine/');
  await expect(fallback.getByRole('link')).toHaveText('Open on whatmakesittick.github.io');
  expect(logs).toContain('[HOST] initialized');
  await fallback.getByRole('button', { name: 'Try again' }).click();
  await expect(view.getByRole('button', { name: 'Try again' })).toBeEnabled();
});
