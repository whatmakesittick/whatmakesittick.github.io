import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import { toWidgetCatalogue } from '../../catalogue/build.ts';
import { PATHS } from '../../shared/config.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const engineIn = (lang: Parameters<typeof toWidgetCatalogue>[1]) =>
  toWidgetCatalogue(buildCatalogue(root), lang).explainers.find((e) => e.slug === 'engine')!;

const built = existsSync(resolve(root, PATHS.widgetModule));

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

const stale = (path: string) => (url: URL) => url.pathname.endsWith(path) && url.search === '';

const servePublishedBefore = async (page: Page, path: string, from: RegExp, to: string) => {
  await page.route(stale(path), async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(from, to);
    await route.fulfill({ response, body });
  });
};

const requested = (page: Page, path: string) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith(path)) urls.push(`${url.pathname.split('/').pop()}${url.search}`);
  });
  return urls;
};

test.describe('after a site deploy', () => {
  test.skip(!built, `${PATHS.widgetModule} is missing (npm run build)`);

  test('a cached embed whose chunks are gone is loaded again fresh', async ({ page }) => {
    await servePublishedBefore(page, '/embed/v1/engine.js', /assets\/shared-/g, 'assets/gone-');
    const urls = requested(page, '/embed/v1/engine.js');
    const { errors, view } = await open(page, 'slug=engine&chapter=strokes');
    await expect(view.locator('.wmit.st-ready[data-slug="engine"]')).toBeVisible({
      timeout: 15_000,
    });
    expect(urls).toEqual(['engine.js', expect.stringMatching(/^engine\.js\?v=[0-9a-z]+$/)]);
    expect(errors).toEqual([]);
  });

  test('a cached embed whose language chunk is gone is loaded again fresh', async ({ page }) => {
    const uk = engineIn('uk');
    await servePublishedBefore(page, '/embed/v1/engine.js', /assets\/uk-/g, 'assets/gone-');
    const { errors, view } = await open(page, 'slug=engine&chapter=strokes&lang=uk');
    await expect(view.locator('.wmit.st-ready[lang="uk"]')).toBeVisible({ timeout: 15_000 });
    await expect(view.getByRole('button', { name: 'Скинути камеру' }).first()).toBeAttached();
    await expect(view.locator('.a-head .title')).toHaveText(uk.title);
    expect(errors).toEqual([]);
  });

  test('a cached widget whose language chunk is gone takes it from a fresh widget', async ({
    page,
  }) => {
    const uk = engineIn('uk');
    await servePublishedBefore(page, '/embed/v1/widget.js', /\.\/widget-uk-/g, './gone-');
    const urls = requested(page, '/embed/v1/widget.js');
    const { errors, view } = await open(page, 'slug=engine&chapter=strokes&lang=uk');
    await expect(view.locator('.wmit.st-ready[lang="uk"]')).toBeVisible({ timeout: 15_000 });
    await expect(view.locator('.a-head .title')).toHaveText(uk.title);
    expect(urls).toEqual(['widget.js', expect.stringMatching(/^widget\.js\?v=[0-9a-z]+$/)]);
    expect(errors).toEqual([]);
  });

  test('a hashed font that is gone loads from its stable path', async ({ page }) => {
    const cors = { 'Access-Control-Allow-Origin': '*' };
    await page.route(
      (url) => /\/assets\/inter-latin-wght-normal-[\w-]+\.woff2$/.test(url.pathname),
      (route) => route.fulfill({ status: 404, headers: cors, body: '' }),
    );
    await page.route(
      (url) => url.pathname === '/embed/v1/fonts/inter-latin-wght-normal.woff2',
      (route) =>
        route.fulfill({
          headers: { ...cors, 'Content-Type': 'font/woff2' },
          path: resolve(root, PATHS.site, 'embed/v1/fonts/inter-latin-wght-normal.woff2'),
        }),
    );
    const stable = page.waitForResponse((response) =>
      response.url().endsWith('/embed/v1/fonts/inter-latin-wght-normal.woff2'),
    );
    const { errors, view } = await open(page, 'slug=engine&chapter=strokes');
    await expect(view.locator('.wmit.st-ready[data-slug="engine"]')).toBeVisible({
      timeout: 15_000,
    });
    expect((await stable).status()).toBe(200);
    expect(errors).toEqual([]);
  });

  test('an embed that is gone for good shows the error with a link to the site', async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname.endsWith('/embed/v1/engine.js'),
      (route) => route.fulfill({ status: 404, body: '' }),
    );
    const urls = requested(page, '/embed/v1/engine.js');
    const { logs, view } = await open(page, 'slug=engine&chapter=strokes');
    await expect(view.locator('.wmit.st-error[data-slug="engine"]')).toBeVisible({
      timeout: 15_000,
    });
    expect(urls).toHaveLength(2);
    await view.getByRole('button', { name: 'Open on site' }).last().click();
    await expect
      .poll(() => logs.find((line) => line.startsWith('[HOST] open-link')))
      .toBe('[HOST] open-link https://whatmakesittick.github.io/engine/');
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
