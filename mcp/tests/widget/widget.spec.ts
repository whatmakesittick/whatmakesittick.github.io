import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page, query: string) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.goto(`/dev.html?${query}`);
  return { errors, logs };
};

test('inline: opens MRI at the requested chapter, chapter nav sends model context', async ({
  page,
}) => {
  const { errors, logs } = await open(page, 'slug=mri-scanner&chapter=magnet');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await expect(page.locator('.a-chapter h3')).toHaveText('A magnet that never switches off');
  await expect(page.locator('[data-stage] [data-dock]').first()).toBeAttached();
  await page.getByRole('button', { name: 'Next chapter' }).first().click();
  await expect(page.locator('.a-chapter h3')).toHaveText('Hydrogen leans and wobbles');
  await expect
    .poll(() => logs.find((l) => l.startsWith('[HOST] ui/update-model-context')))
    .toContain('"chapter":"spins"');
  expect(errors).toEqual([]);
});

for (const data of ['content', 'structured']) {
  test(`result only in ${data}`, async ({ page }) => {
    await open(page, `slug=engine&chapter=strokes&data=${data}`);
    await expect(page.locator('.wmit.st-ready[data-slug="engine"]')).toBeVisible();
  });
}

test('switch in place and fullscreen round trip', async ({ page }) => {
  const { errors } = await open(page, 'slug=mri-scanner');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await page.locator('.strip .thumb[data-slug="heart"]').click();
  await expect(page.locator('.wmit.st-ready[data-slug="heart"]')).toBeVisible();
  await expect(page.locator('style[data-embed-styles]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fullscreen' }).click();
  await expect(page.locator('.wmit.is-fs')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-stage-expanded', '');
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await expect(page.locator('.wmit.is-inline')).toBeVisible();
  expect(errors).toEqual([]);
});

test('states: loading, no WebGL, error, unknown', async ({ page }) => {
  await open(page, 'state=loading');
  await expect(page.getByText('Building the 3D scene')).toBeVisible();
  await open(page, 'state=nowebgl');
  await expect(page.getByText("3D isn't available here")).toBeVisible();
  await expect(page.locator('.a-controls')).toHaveCount(0);
  await open(page, 'state=error');
  await expect(page.getByText("The 3D scene didn't load")).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await open(page, 'state=unknown');
  await expect(page.getByText('Pick an explainer')).toBeVisible();
});

test('a failed switch shows the error state', async ({ page }) => {
  await open(page, 'slug=mri-scanner&failSlugs=engine');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await page.locator('.strip .thumb[data-slug="engine"]').click();
  await expect(page.locator('.wmit.st-error[data-slug="engine"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open on site' }).last()).toBeVisible();
});

const box = async (page: Page, selector: string) =>
  (await page.locator(selector).first().boundingBox())!;

test('fallback dock (module without ui slots): below the scene inline, phase labels seek', async ({
  page,
}) => {
  const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await expect(page.locator('[data-stage] .dock-slot')).toBeAttached();
  await expect(page.locator('[data-stage] .gauge-slot')).toBeAttached();
  const dock = page.locator('.dock-fallback');
  await expect(dock).toBeVisible();
  expect((await box(page, '.dock-fallback')).y).toBeGreaterThanOrEqual(
    (await box(page, '.stage')).y + (await box(page, '.stage')).height - 1,
  );
  await dock.locator('.phases button', { hasText: 'Recover' }).click();
  await expect(dock.locator('.phases button.on')).toHaveText('Recover');
  expect(errors).toEqual([]);
});

for (const [width, stacked] of [
  [840, false],
  [420, true],
] as const) {
  test(`fullscreen ${width}px: prose ${stacked ? 'below' : 'beside'} the scene, never over it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet&mode=fullscreen');
    await expect(page.locator('.wmit.is-fs.st-ready')).toBeVisible();
    const scene = await box(page, '.scene-col');
    const prose = await box(page, '.prose');
    if (stacked) expect(prose.y).toBeGreaterThanOrEqual(scene.y + scene.height - 1);
    else expect(prose.x).toBeGreaterThanOrEqual(scene.x + scene.width - 1);
    await expect(page.locator('.prose .chapter.is-active .chapter-title')).toHaveText(
      'A magnet that never switches off',
    );
    await page.locator('.prose .chapter-head', { hasText: 'Hydrogen leans and wobbles' }).click();
    await expect(page.locator('.prose .chapter.is-active .chapter-title')).toHaveText(
      'Hydrogen leans and wobbles',
    );
    await expect(page.locator('.prose .chapter.is-active .ch-text p').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

const realEmbed = existsSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../dist/embed/v1/black-hole.js'),
);
test.describe('real embed (dist): the site dock and gauge in the slots', () => {
  test.skip(!realEmbed, 'npm run build first');
  test('black hole: site dock inline and fullscreen, gauge only in fullscreen', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 840, height: 1000 });
    const { errors } = await open(page, 'slug=black-hole&real=1');
    await expect(page.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
    const dock = page.locator('.dock-slot[data-embed-ui] [data-dock]');
    await expect(dock).toBeVisible();
    await expect(page.locator('.dock-fallback')).toBeHidden();
    const phases = dock.locator('[data-phase-buttons] button');
    await expect(phases).toHaveText([
      'Letting go',
      'Speeding up',
      'Past the last orbit',
      'Inside the light ring',
      'Inside',
    ]);
    await phases.nth(2).click();
    await expect(phases.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(dock.locator('[data-speed-label]')).toHaveText('Playback');
    await expect(page.locator('.gauge-slot [data-gauge]')).toBeHidden();

    await page.getByRole('button', { name: 'Fullscreen' }).click();
    await expect(page.locator('.wmit.is-fs')).toBeVisible();
    await expect(page.locator('.gauge-slot [data-gauge] .readout').first()).toBeVisible();
    await expect(page.locator('.gauge-slot [data-gauge] dt').first()).toHaveText('Probe clock');
    const scene = await box(page, '.scene-col');
    const d = await box(page, '.dock-slot');
    expect(d.y + d.height).toBeLessThanOrEqual(scene.y + scene.height);
    const speed = dock.locator('[data-control="speed"]');
    await speed.fill((await speed.getAttribute('max')) ?? '1');
    await expect(dock.locator('[data-speed-value] .field-value-number')).toHaveText(/×/);
    expect(errors).toEqual([]);
  });
});
