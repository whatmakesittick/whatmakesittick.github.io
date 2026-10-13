import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import {
  parseEmbedCatalogue,
  renderEmbedCatalogue,
  type EmbedCatalogue,
  type EmbedCatalogueEntry,
} from '../../../vite/embedCatalogue.ts';
import { toWidgetCatalogue } from '../../catalogue/build.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const full = buildCatalogue(root);
const mriIn = (lang: Parameters<typeof toWidgetCatalogue>[1]) =>
  toWidgetCatalogue(full, lang).explainers.find((e) => e.slug === 'mri-scanner')!;

const open = async (page: Page, query: string) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.goto(`/dev.html?${query}`);
  return { errors, logs };
};

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

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

test('the lang tool argument shows the widget in Ukrainian without an English flash', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { englishSeen: seen });
    new MutationObserver(() => {
      const text = document.body?.innerText ?? '';
      for (const phrase of ['Building the 3D scene', 'Next chapter', 'Open on site'])
        if (text.includes(phrase) && !seen.includes(phrase)) seen.push(phrase);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const uk = mriIn('uk');
  const { errors, logs } = await open(page, 'slug=mri-scanner&chapter=magnet&lang=uk');
  await expect(page.locator('.wmit.st-ready[lang="uk"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
  await expect(page.locator('.a-head .title')).toHaveText(uk.title);
  await expect(page.locator('.a-chapter h3')).toHaveText(uk.chapters[1]!.title);
  await expect(page.locator('.pill.on')).toContainText(uk.chapters[1]!.title);
  await page.getByRole('button', { name: 'Наступний розділ' }).first().click();
  await expect(page.locator('.a-chapter h3')).toHaveText(uk.chapters[2]!.title);
  await expect
    .poll(() => logs.find((l) => l.startsWith('[HOST] ui/update-model-context')))
    .toContain('Language: uk.');
  expect(
    await page.evaluate(() => (window as unknown as { englishSeen: string[] }).englishSeen),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('the host locale is the fallback when the model passes no lang', async ({ page }) => {
  const de = mriIn('de');
  const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet&locale=de-DE');
  await expect(page.locator('.wmit.st-ready[lang="de"]')).toBeVisible();
  await expect(page.locator('.a-chapter h3')).toHaveText(de.chapters[1]!.title);
  await expect(page.getByRole('button', { name: 'Nächstes Kapitel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modell im Vollbild ansehen' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('an unsupported lang argument falls back to English', async ({ page }) => {
  const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet&lang=ru&locale=de-DE');
  await expect(page.locator('.wmit.st-ready[lang="en"]')).toBeVisible();
  await expect(page.locator('.a-chapter h3')).toHaveText('A magnet that never switches off');
  expect(errors).toEqual([]);
});

test('a later call switches the language in place', async ({ page }) => {
  const ja = mriIn('ja');
  const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet&lang=uk');
  await expect(page.locator('.wmit.st-ready[lang="uk"]')).toBeVisible();
  await page.getByRole('button', { name: 'Наступний розділ' }).first().click();
  await page.evaluate(() =>
    (
      window as unknown as { wmitDev: { hub: { emit: (e: string, a: unknown) => void } } }
    ).wmitDev.hub.emit('input', { slug: 'mri-scanner', lang: 'ja' }),
  );
  await expect(page.locator('.wmit.st-ready[lang="ja"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('.a-chapter h3')).toHaveText(ja.chapters[2]!.title);
  await expect(page.locator('.a-chapter .ch-text')).toContainText(ja.chapters[2]!.title);
  await expect(page.getByRole('button', { name: '次の章' })).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { wmitDev: { setLocale: (l: string) => void } }).wmitDev.setLocale(
      'zh-CN',
    ),
  );
  await expect(page.locator('.wmit[lang="ja"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a new host locale switches when the model passed no lang', async ({ page }) => {
  const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet');
  await expect(page.locator('.wmit.st-ready[lang="en"]')).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { wmitDev: { setLocale: (l: string) => void } }).wmitDev.setLocale(
      'zh-CN',
    ),
  );
  await expect(page.locator('.wmit.st-ready[lang="zh"]')).toBeVisible();
  await expect(page.locator('.a-chapter h3')).toHaveText(mriIn('zh').chapters[1]!.title);
  expect(errors).toEqual([]);
});

for (const [lang, expected, absent] of [
  ['zh', ['PingFang SC', 'Noto Sans SC'], ['Yu Gothic UI']],
  ['ja', ['Hiragino Sans', 'Noto Sans JP'], ['PingFang SC']],
  ['en', ['Inter Variable'], ['PingFang SC', 'Yu Gothic UI']],
] as const) {
  test(`the widget text uses the site font stack for ${lang}`, async ({ page }) => {
    const { errors } = await open(page, `slug=mri-scanner&chapter=magnet&lang=${lang}`);
    await expect(page.locator(`.wmit.st-ready[lang="${lang}"]`)).toBeVisible();
    for (const selector of ['.a-head .title', '.a-chapter h3', '.a-head .ghost', '.pill']) {
      const family = await page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
      for (const name of expected) expect(family, selector).toContain(name);
      for (const name of absent) expect(family, selector).not.toContain(name);
    }
    expect(errors).toEqual([]);
  });
}

for (const lang of ['en', 'uk']) {
  test(`the stage guards the wheel and holds the dock height during a switch (${lang})`, async ({
    page,
  }) => {
    const { errors } = await open(page, `slug=mri-scanner&chapter=magnet&lang=${lang}&delay=800`);
    await expect(page.locator(`.wmit.st-ready[lang="${lang}"]`)).toBeVisible();
    const escaped = await page.evaluate(() => {
      let count = 0;
      window.addEventListener('wheel', () => count++);
      document
        .querySelector('.viewport')
        ?.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 40 }));
      return count;
    });
    expect(escaped).toBe(0);
    await page.waitForTimeout(400);
    await page.locator('.strip .thumb[data-slug="engine"]').click();
    await expect(page.locator('.wmit.st-loading[data-slug="engine"]')).toBeVisible();
    expect(
      await page
        .locator('[data-stage] .dock-slot')
        .evaluate((slot: HTMLElement) => slot.style.minHeight),
    ).toMatch(/^[1-9][0-9.]*px$/);
    expect(errors).toEqual([]);
  });
}

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
  await page.getByRole('button', { name: 'Show the model full screen' }).click();
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

test('inline: the dock fills its slot below the scene, phase buttons seek', async ({ page }) => {
  const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await expect(page.locator('[data-stage] .gauge-slot')).toBeAttached();
  const dock = page.locator('[data-stage] .dock-slot[data-embed-ui] [data-dock]');
  await expect(dock).toBeVisible();
  expect((await box(page, '.dock-slot')).y).toBeGreaterThanOrEqual(
    (await box(page, '.stage')).y + (await box(page, '.stage')).height - 1,
  );
  const recover = dock.locator('[data-phase-buttons] button', { hasText: 'Recover' });
  await recover.click();
  await expect(recover).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

for (const [width, height, compact] of [
  [1440, 900, false],
  [390, 844, true],
  [844, 390, true],
] as const) {
  test(`fullscreen ${width}x${height}: the scene fills the frame like the expanded stage on the site`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const { errors } = await open(page, 'slug=mri-scanner&chapter=magnet&mode=fullscreen');
    await expect(page.locator('.wmit.is-fs.st-ready')).toBeVisible();
    const frame = await box(page, '.wmit');
    const stage = await box(page, '.stage');
    expect(stage).toEqual(frame);
    await expect(page.locator('.a-head, .a-chapter, .a-explore')).toHaveCount(3);
    for (const part of await page.locator('.a-head, .a-chapter, .a-explore').all())
      await expect(part).toBeHidden();
    const exit = page.getByRole('button', { name: 'Exit fullscreen' });
    await expect(exit).toHaveAttribute('aria-pressed', 'true');
    const button = await box(page, '.stage-expand');
    const inset = compact ? 10 : 16;
    expect(button.y).toBe(frame.y + inset);
    expect(button.x + button.width).toBe(frame.x + frame.width - inset);
    const dock = await box(page, '.dock-slot');
    expect(dock.x).toBe(frame.x + inset);
    expect(dock.x + dock.width).toBe(frame.x + frame.width - inset);
    expect(dock.y + dock.height).toBe(frame.y + frame.height - (compact ? 10 : 26));
    await expect(page.locator('.dock-slot .dock-more')).toBeVisible({ visible: compact });
    await expect(page.locator('.dock-slot [data-phase-buttons]')).toBeVisible({
      visible: !compact,
    });
    await exit.click();
    await expect(page.locator('.wmit.is-inline')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('fullscreen keys: X toggles the display mode and Escape leaves it, as on the site', async ({
  page,
}) => {
  const { errors, logs } = await open(page, 'slug=engine');
  await expect(page.locator('.wmit.is-inline.st-ready')).toBeVisible();
  await page.keyboard.press('x');
  await expect(page.locator('.wmit.is-fs')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.wmit.is-inline')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.wmit.is-inline')).toBeVisible();
  expect(logs.filter((l) => l.startsWith('[HOST] ui/request-display-mode'))).toEqual([
    '[HOST] ui/request-display-mode fullscreen',
    '[HOST] ui/request-display-mode inline',
  ]);
  expect(errors).toEqual([]);
});

test('arrow keys: fullscreen hands them to the embed, inline binds none', async ({ page }) => {
  const { errors, logs } = await open(page, 'slug=mri-scanner&chapter=magnet');
  await expect(page.locator('.wmit.is-inline.st-ready')).toBeVisible();
  const title = page.locator('.a-chapter h3');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await expect(title).toHaveText('A magnet that never switches off');
  expect(logs.filter((l) => l.startsWith('[HOST] ui/update-model-context'))).toEqual([]);

  await page.keyboard.press('x');
  await expect(page.locator('.wmit.is-fs')).toBeVisible();
  await page.keyboard.press(' ');
  const scrubber = page.locator('.dock-slot [data-control="scrubber"]');
  const at = Number(await scrubber.inputValue());
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await scrubber.inputValue())).toBeGreaterThan(at);
  await page.keyboard.press('Escape');
  await expect(page.locator('.wmit.is-inline')).toBeVisible();
  await expect(title).toHaveText('A magnet that never switches off');
  expect(errors).toEqual([]);
});

for (const [width, height] of [
  [384, 854],
  [1010, 723],
] as const) {
  test(`fullscreen ${width}px with host insets: the overlays stay inside them`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const { errors } = await open(page, 'slug=engine&mode=fullscreen&insets=100,0,120,0');
    await expect(page.locator('.wmit.is-fs.st-ready')).toBeVisible();
    const frame = await box(page, '.wmit');
    expect(await box(page, '.stage')).toEqual(frame);
    const inset = width < 900 ? 10 : 16;
    expect((await box(page, '.stage-expand')).y).toBe(frame.y + 100 + inset);
    const dock = await box(page, '.dock-slot');
    expect(dock.y).toBeGreaterThanOrEqual(frame.y + 100);
    expect(dock.y + dock.height).toBeLessThanOrEqual(frame.y + frame.height - 120);
    expect(errors).toEqual([]);
  });
}

test('fullscreen phone landscape with host insets: the dock collapses to one row between them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 874, height: 402 });
  const { errors } = await open(page, 'slug=engine&mode=fullscreen&insets=60,0,110,0');
  await expect(page.locator('.wmit.is-fs.st-ready')).toBeVisible();
  const frame = await box(page, '.wmit');
  const more = page.locator('.dock-slot [data-control="more"]');
  await expect(more).toBeVisible();
  await expect(page.locator('.dock-slot .dock-extra')).toBeHidden();
  const dock = await box(page, '.dock-slot');
  expect(dock.width).toBe(frame.width - 20);
  expect(dock.y).toBeGreaterThanOrEqual(frame.y + 60);
  expect(dock.y + dock.height).toBe(frame.y + frame.height - 120);
  await more.click();
  await expect(page.locator('.dock-slot .dock-extra')).toBeVisible();
  const expanded = await box(page, '.dock-slot');
  expect(expanded.y + expanded.height).toBe(dock.y + dock.height);
  expect(expanded.y).toBeGreaterThanOrEqual(frame.y);
  expect(errors).toEqual([]);
});

const realEmbed = existsSync(resolve(root, 'dist/embed/v1/black-hole.js'));
test.describe('real embed (dist): the site dock and gauge in the slots', () => {
  test.skip(!realEmbed, 'npm run build first');
  test('black hole: site dock inline and fullscreen, gauge only in fullscreen', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1200, height: 1000 });
    const { errors } = await open(page, 'slug=black-hole&real=1');
    await expect(page.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
    const dock = page.locator('.dock-slot[data-embed-ui] [data-dock]');
    await expect(dock).toBeVisible();
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

    await page.getByRole('button', { name: 'Show the model full screen' }).click();
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

  test('fullscreen dock: a press on the icon in the middle of a button reaches the button', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1010, height: 723 });
    const { errors } = await open(
      page,
      'slug=black-hole&real=1&mode=fullscreen&insets=16,16,136,16',
    );
    await expect(page.locator('.wmit.is-fs.st-ready')).toBeVisible({ timeout: 30_000 });
    const dock = page.locator('.dock-slot [data-dock]');
    await expect(dock.locator('[data-control="play"]')).toHaveAttribute('data-playing', 'true');
    const buttons = dock.locator(
      '[data-control="play"], [data-control="reset-camera"], [data-view]',
    );
    await expect(buttons).toHaveCount(5);
    for (const button of await buttons.all()) {
      const hit = await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === element
        );
      });
      expect(hit).toBe(true);
    }
    for (const toggle of await dock.locator('[data-view]').all()) {
      const before = await toggle.getAttribute('aria-pressed');
      const b = await toggle.boundingBox();
      if (!b) throw new Error('toggle without a box');
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.up();
      await expect(toggle).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
    }
    expect(errors).toEqual([]);
  });

  test('engine fullscreen: the gauge has the cycle dial and the keys are the site keys', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    const { errors } = await open(page, 'slug=engine&real=1&mode=fullscreen');
    await expect(page.locator('.wmit.is-fs.st-ready')).toBeVisible({ timeout: 30_000 });
    const gauge = page.locator('.gauge-slot [data-gauge]');
    await expect(gauge.locator('.gauge-dial .dial')).toBeVisible();
    await expect(gauge.locator('.readout').first()).toBeVisible();
    await expect(page.locator('[data-stage]')).not.toHaveAttribute('data-gauge-clash');
    const g = await box(page, '.gauge-slot [data-gauge]');
    const d = await box(page, '.dock-slot [data-dock]');
    expect(g.y + g.height).toBeLessThanOrEqual(d.y);
    await expect(gauge.locator('.readout dt').first()).toHaveCSS('line-height', '16.5px');
    await expect(gauge.locator('.readout dd').first()).toHaveCSS('line-height', '21px');
    const needle = () => gauge.locator('.dial-needle').getAttribute('transform');
    const scrubber = page.locator('.dock-slot [data-control="scrubber"]');
    const at = Number(await scrubber.inputValue());
    const before = await needle();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Number(await scrubber.inputValue())).toBeGreaterThan(at);
    expect(await needle()).not.toBe(before);
    const phases = page.locator('.dock-slot [data-phase-buttons] button');
    await page.keyboard.press('3');
    await expect(phases.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(phases.nth(1)).toHaveAttribute('aria-pressed', 'true');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(gauge).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('compact dock: a click on the center line of the scrubber seeks', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 420, height: 800 });
    const { errors } = await open(page, 'slug=engine&real=1&mode=fullscreen');
    await expect(page.locator('.wmit.st-ready')).toBeVisible({ timeout: 30_000 });
    const scrubber = page.locator('.dock-slot [data-control="scrubber"]');
    await expect(page.locator('.dock-slot .dock-more')).toBeVisible();
    const track = await box(page, '.dock-slot [data-control="scrubber"]');
    const y = track.y + track.height / 2;
    for (const share of [0.2, 0.8]) {
      const x = track.x + track.width * share;
      expect(
        await page.evaluate(
          ([px, py]) => document.elementFromPoint(px!, py!)?.matches('input'),
          [x, y],
        ),
      ).toBe(true);
      await page.mouse.click(x, y);
      const min = Number(await scrubber.getAttribute('min'));
      const max = Number(await scrubber.getAttribute('max'));
      await expect
        .poll(async () => (Number(await scrubber.inputValue()) - min) / (max - min))
        .toBeCloseTo(share, 1);
    }
    expect(errors).toEqual([]);
  });
});

test('excluded explainers stay out of the strip and the picker', async ({ page }) => {
  const { errors, logs } = await open(page, 'slug=mri-scanner&exclude=weapons');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await expect(page.locator('.strip .thumb[data-slug="heart"]')).toBeAttached();
  await expect(page.locator('.thumb[data-slug="rifle"]')).toHaveCount(0);
  await expect(page.locator('.thumb[data-slug="reaper"]')).toHaveCount(0);
  await open(page, 'state=unknown&exclude=weapons');
  await expect(page.getByText('Pick an explainer')).toBeVisible();
  await expect(page.locator('.thumb[data-slug="heart"]')).toBeAttached();
  await expect(page.locator('.thumb[data-slug="rifle"]')).toHaveCount(0);
  expect(logs.filter((l) => l.includes('rifle'))).toEqual([]);
  expect(errors).toEqual([]);
});

const publishLater = async (page: Page) => {
  const requests: string[] = [];
  let added: Pick<EmbedCatalogueEntry, 'slug' | 'tags'>[] = [];
  await page.route(
    (url) => url.pathname.endsWith('/embed/v1/catalogue/en.js') && url.search.startsWith('?v='),
    async (route) => {
      requests.push(route.request().url());
      const response = await route.fetch();
      const catalogue = parseEmbedCatalogue(await response.text()) as EmbedCatalogue;
      const heart = catalogue.explainers.find((e) => e.slug === 'heart')!;
      const explainers = [
        ...catalogue.explainers,
        ...added.map((a) => ({ ...heart, ...a, title: `New ${a.slug}` })),
      ];
      await route.fulfill({ response, body: renderEmbedCatalogue({ ...catalogue, explainers }) });
    },
  );
  return {
    requests,
    publish: (entries: typeof added) => void (added = entries),
  };
};

const NEW_EXPLAINERS = [
  { slug: 'lathe', tags: ['tools' as const, 'mechanics' as const] },
  { slug: 'cannon', tags: ['weapons' as const, 'physics' as const] },
];

test('a catalogue published while the widget is open shows up when the user opens the strip', async ({
  page,
}) => {
  await page.clock.install();
  const site = await publishLater(page);
  const { errors } = await open(page, 'slug=mri-scanner&exclude=weapons');
  await expect(page.locator('.wmit.st-ready')).toBeVisible();
  await page.locator('.a-explore h4').hover();
  await expect.poll(() => site.requests.length).toBe(1);
  await page.locator('.a-head').hover();
  site.publish(NEW_EXPLAINERS);
  await page.locator('.a-explore h4').hover();
  await page.locator('.a-head').hover();
  await expect(page.locator('.strip .thumb[data-slug="lathe"]')).toHaveCount(0);
  expect(site.requests).toHaveLength(1);
  await page.clock.fastForward('05:01');
  await page.locator('.a-explore h4').hover();
  await expect(page.locator('.strip .thumb[data-slug="lathe"]')).toBeAttached();
  await expect(page.locator('.strip .thumb[data-slug="lathe"] .t')).toHaveText('New lathe');
  await expect(page.locator('.thumb[data-slug="cannon"]')).toHaveCount(0);
  await expect(page.locator('.thumb[data-slug="rifle"]')).toHaveCount(0);
  await expect(page.locator('.wmit.st-ready[data-slug="mri-scanner"]')).toBeVisible();
  expect(site.requests).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('the picker shows an explainer published after the call, but not an excluded one', async ({
  page,
}) => {
  const site = await publishLater(page);
  site.publish(NEW_EXPLAINERS);
  const { errors } = await open(page, 'state=unknown&exclude=weapons');
  await expect(page.getByText('Pick an explainer')).toBeVisible();
  await expect(page.locator('.thumb[data-slug="heart"]')).toBeAttached();
  await expect(page.locator('.thumb[data-slug="lathe"]')).toHaveCount(0);
  await page.locator('.a-explore.unknown').hover();
  await expect(page.locator('.thumb[data-slug="lathe"]')).toBeAttached();
  await expect(page.locator('.thumb[data-slug="cannon"]')).toHaveCount(0);
  await expect(page.locator('.thumb[data-slug="rifle"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

const renamedLater = async (page: Page) => {
  const state = { deployed: false, refreshes: 0, aliasImports: 0 };
  await page.route(
    (url) => url.pathname.endsWith('/embed/v1/catalogue/en.js'),
    async (route) => {
      const fresh = new URL(route.request().url()).search.startsWith('?v=');
      const deployed = state.deployed;
      const response = await route.fetch();
      const catalogue = parseEmbedCatalogue(await response.text()) as EmbedCatalogue;
      const body = deployed
        ? { ...catalogue, aliases: { 'old-heart': 'heart' } }
        : {
            ...catalogue,
            explainers: catalogue.explainers.map((e) =>
              e.slug === 'heart' ? { ...e, slug: 'old-heart' } : e,
            ),
          };
      await route.fulfill({ response, body: renderEmbedCatalogue(body) });
      if (fresh) state.refreshes++;
    },
  );
  await page.route(
    (url) => url.pathname.endsWith('/embed/v1/old-heart.js'),
    async (route) => {
      state.aliasImports++;
      await route.fulfill({
        contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'export * from "./heart.js";\n',
      });
    },
  );
  return state;
};

test.describe('a renamed explainer', () => {
  test('a strip tile from a list older than the rename opens the new explainer', async ({
    page,
  }) => {
    test.skip(!existsSync(resolve(root, 'dist/embed/v1/heart.js')), 'needs npm run build');
    const site = await renamedLater(page);
    const { errors, logs } = await open(page, 'slug=mri-scanner&chapter=magnet&real=1');
    await expect(page.locator('.wmit.st-ready[data-slug="mri-scanner"]')).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('.a-explore h4').hover();
    await expect.poll(() => site.refreshes).toBe(1);
    site.deployed = true;
    await page.locator('.strip .thumb[data-slug="old-heart"]').click();
    await expect(page.locator('.wmit.st-ready[data-slug="heart"]')).toBeVisible({
      timeout: 20_000,
    });
    expect(site.aliasImports).toBe(1);
    await expect
      .poll(() => logs.filter((l) => l.startsWith('[HOST] ui/update-model-context')).at(-1))
      .toContain('"slug":"heart"');
    await expect(page.locator('.strip .thumb.cur[data-slug="heart"]')).toBeAttached();
    await expect(page.locator('.thumb[data-slug="old-heart"]')).toHaveCount(0);
    await expect.poll(() => site.refreshes).toBe(2);
    expect(errors).toEqual([]);
  });

  test('a former slug in the tool call opens the new explainer', async ({ page }) => {
    const site = await renamedLater(page);
    site.deployed = true;
    const { errors } = await open(page, 'slug=old-heart');
    await expect(page.locator('.wmit.st-ready[data-slug="heart"]')).toBeVisible();
    await expect(page.locator('.strip .thumb.cur[data-slug="heart"]')).toBeAttached();
    expect(site.aliasImports).toBe(0);
    expect(errors).toEqual([]);
  });
});
