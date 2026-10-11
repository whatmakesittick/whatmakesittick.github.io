import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { PATHS } from '../../shared/config.ts';

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
