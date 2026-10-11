import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const realEmbed = existsSync(resolve(root, 'dist/embed/v1/engine.js'));
const builtWidget = existsSync(resolve(root, 'dist/embed/v1/widget.js'));

interface Row {
  st: string;
  slug: string;
  wmit: number;
  col: number;
  stage: number;
}

const sample = () => {
  const rows: unknown[] = [];
  Object.assign(window, { wmitRows: rows });
  const h = (s: string) => {
    const el = document.querySelector(s);
    return el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : -1;
  };
  const tick = () => {
    const w = document.querySelector<HTMLElement>('.wmit');
    rows.push({
      st: /st-(\w+)/.exec(w?.className ?? '')?.[1] ?? '',
      slug: w?.dataset.slug ?? '',
      wmit: h('.wmit'),
      col: h('.scene-col'),
      stage: h('.stage'),
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const open = async (page: Page, query: string, width: number) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: width + 32, height: 1400 });
  await page.addInitScript(sample);
  await page.goto(`/dev.html?${query}&width=${width + 32}`);
  return errors;
};

const rows = (page: Page) =>
  page.evaluate(() => (window as unknown as { wmitRows: Row[] }).wmitRows.slice());

const since = (all: Row[], from: number) => all.slice(from).filter((r) => r.st !== '');
const values = (all: Row[], key: keyof Row) => [...new Set(all.map((r) => r[key]))];

const switchTo = async (page: Page, slug: string, state = 'ready') => {
  await page.waitForTimeout(400);
  const from = (await rows(page)).length;
  await page.locator(`.strip .thumb[data-slug="${slug}"]`).click();
  await expect(page.locator(`.wmit.st-loading[data-slug="${slug}"]`)).toBeVisible();
  await expect(page.locator(`.wmit.st-${state}[data-slug="${slug}"]`)).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(400);
  return since(await rows(page), from - 1);
};

test.describe('the scene area keeps its height while an explainer loads', () => {
  test.skip(!realEmbed, 'npm run build first');
  test.setTimeout(90_000);

  for (const width of [736, 400]) {
    test(`switching explainers at ${width}px keeps the widget and the stage still`, async ({
      page,
    }) => {
      const errors = await open(page, 'slug=mri-scanner&chapter=magnet&real=1&slow=1500', width);
      await expect(page.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
      const during = await switchTo(page, 'engine');
      expect(during.some((r) => r.st === 'loading')).toBe(true);
      expect(values(during, 'stage')).toHaveLength(1);
      expect(values(during, 'col')).toHaveLength(1);
      expect(values(during, 'wmit')).toHaveLength(1);
      expect(errors).toEqual([]);
    });

    test(`the first load at ${width}px is as tall as the ready widget`, async ({ page }) => {
      const errors = await open(page, 'slug=heart&real=1&slow=1500', width);
      await expect(page.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(400);
      const all = (await rows(page)).filter((r) => r.st === 'loading' || r.st === 'ready');
      expect(all.some((r) => r.st === 'loading')).toBe(true);
      expect(values(all, 'col')).toHaveLength(1);
      expect(values(all, 'wmit')).toHaveLength(1);
      expect(errors).toEqual([]);
    });
  }

  test('a switch to a smaller dock holds the old height until the new scene is ready', async ({
    page,
  }) => {
    const errors = await open(page, 'slug=mri-scanner&chapter=magnet&real=1&slow=1500', 736);
    await expect(page.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
    const during = await switchTo(page, 'heart');
    const before = during[0]!.col;
    expect(during.filter((r) => r.st !== 'ready').every((r) => r.col === before)).toBe(true);
    const after = during.filter((r) => r.st === 'ready' && r.slug === 'heart');
    expect(values(after, 'col')).toHaveLength(1);
    expect(after[0]!.col).toBeLessThan(before);
    expect(errors).toEqual([]);
  });
});

test('a failed switch keeps the scene area height', async ({ page }) => {
  const errors = await open(
    page,
    'slug=mri-scanner&chapter=magnet&failSlugs=engine&delay=800',
    736,
  );
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  const during = await switchTo(page, 'engine', 'error');
  expect(during.some((r) => r.st === 'loading')).toBe(true);
  expect(values(during, 'col')).toHaveLength(1);
  expect(errors).toEqual([]);
});

test.describe('the host gets no size change while an explainer loads', () => {
  test.skip(!builtWidget, 'npm run build first');
  test.setTimeout(90_000);

  for (const width of [736, 400]) {
    test(`switch through the loader at ${width}px`, async ({ page }) => {
      const logs: string[] = [];
      page.on('console', (m) => logs.push(m.text()));
      await page.goto(`/host.html?slug=mri-scanner&chapter=magnet&delay=1500&width=${width}`);
      const view = page.frameLocator('iframe');
      await expect(view.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(600);
      const from = logs.length;
      await view.locator('.strip .thumb[data-slug="engine"]').click();
      await expect(view.locator('.wmit.st-loading[data-slug="engine"]')).toBeVisible();
      await expect(view.locator('.wmit.st-ready[data-slug="engine"]')).toBeVisible({
        timeout: 30_000,
      });
      await page.waitForTimeout(600);
      expect(logs.slice(from).filter((l) => l.startsWith('[HOST] size'))).toEqual([]);
    });
  }
});
