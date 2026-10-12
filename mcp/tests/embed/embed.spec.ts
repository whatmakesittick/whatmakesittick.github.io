import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import type { CatalogueEntry } from '../../shared/catalogue.ts';
import type { EmbedInfo, EmbedState, EmbedUiMounted } from '../../../src/core/embed/contract.ts';
import { startStaticServer, type StaticServer } from './server.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const dist = resolve(root, 'dist');

if (!existsSync(resolve(dist, 'embed/v1/manifest.json'))) {
  throw new Error('Build the site first: npm run build');
}
const catalogue = buildCatalogue(root);
const bySlug = new Map(catalogue.explainers.map((e) => [e.slug, e]));

interface Mounted {
  apiVersion: number;
  slug: string;
  info: EmbedInfo;
  state: EmbedState;
  ui: EmbedUiMounted | null;
}

interface SiteUiDom {
  slots: string[];
  dockVisible: boolean;
  phases: string[];
  pressed: string[];
  speed: { min: number; max: number; step: number; value: number } | null;
  speedLabel: string | null;
  speedValue: string | null;
  play: string | null;
  readouts: string[];
  values: string[];
  texts: string;
}

let server: StaticServer;
test.beforeAll(async () => {
  server = await startStaticServer(dist, here);
});
test.afterAll(async () => {
  await server?.close();
});

function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || /Too many active WebGL contexts/i.test(text)) {
      problems.push(`${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function openHarness(page: Page): Promise<Frame> {
  const assets = `http://localhost:${server.port}/embed/v1/`;
  await page.goto(
    `http://127.0.0.1:${server.port}/harness.html?assets=${encodeURIComponent(assets)}`,
  );
  const handle = await page.waitForSelector('iframe');
  const frame = (await handle.contentFrame())!;
  await frame.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
  return frame;
}

type Wmit = Record<string, (...args: unknown[]) => unknown>;
const wmit = <T>(frame: Frame, method: string, ...args: unknown[]): Promise<T> =>
  frame.evaluate(
    ([m, a]) => (window as unknown as { wmit: Wmit }).wmit[m as string]!(...(a as unknown[])),
    [method, args] as const,
  ) as Promise<T>;

const frameErrors = (frame: Frame) =>
  frame.evaluate(() => (window as unknown as { __errors: string[] }).__errors);

async function paintedShare(page: Page, frame: Frame): Promise<number> {
  const png = await frame.locator('#viewport').screenshot();
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, img.width, img.height);
    const counts = new Map<number, number>();
    for (let i = 0; i < data.length; i += 4) {
      const key = ((data[i]! >> 3) << 10) | ((data[i + 1]! >> 3) << 5) | (data[i + 2]! >> 3);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const [mode] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const mr = (mode >> 10) << 3;
    const mg = ((mode >> 5) & 31) << 3;
    const mb = (mode & 31) << 3;
    let painted = 0;
    for (let i = 0; i < data.length; i += 4) {
      const d = Math.abs(data[i]! - mr) + Math.abs(data[i + 1]! - mg) + Math.abs(data[i + 2]! - mb);
      if (d > 48) painted++;
    }
    return painted / (data.length / 4);
  }, png.toString('base64'));
}

type Strings = { [key: string]: string | Strings };

function readStrings(path: string): Strings {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as Strings;
}

function translator(slug: string, code: string): (key: string) => string {
  const sources = [
    readStrings(`explainers/${slug}/locales/${code}.json`),
    readStrings(`src/core/locales/${code}.json`),
  ];
  return (key) => {
    for (const source of sources) {
      let node: string | Strings | undefined = source;
      for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined;
      if (typeof node === 'string') return node;
    }
    return key;
  };
}

function expectTranslated(info: EmbedInfo, entry: CatalogueEntry, code: string): void {
  const t = translator(entry.slug, code);
  expect(info.language).toBe(code);
  expect(info.title).toBe(t('meta.title'));
  expect(info.title).not.toBe(entry.title);
  expect(info.tagline).toBe(t('meta.tagline'));
  expect(info.chapters.map((c) => c.title)).toEqual(
    entry.chapters.map((c) => t(`sections.${c.id}.title`)),
  );
}

function expectEnglishLabels(labels: string[], entry: CatalogueEntry): void {
  const parts = new Set(entry.parts);
  for (const label of labels) {
    expect(label, `${entry.slug}: label looks like an i18n key`).not.toMatch(
      /^[a-z][\w-]*(\.[\w-]+)+$/,
    );
    expect(
      parts.has(label),
      `${entry.slug}: label "${label}" is not one of its EN part names`,
    ).toBe(true);
  }
}

test.describe('embed v1 under the strict spec CSP', () => {
  test('the browser asks for German', async ({ page }) => {
    const frame = await openHarness(page);
    const env = await wmit<{ language: string }>(frame, 'env');
    expect(env.language).toBe('de-DE');
  });

  test('the CSP is enforced (connect-src none blocks fetch)', async ({ page }) => {
    const frame = await openHarness(page);
    const blocked = await frame.evaluate(() =>
      fetch(location.href.startsWith('about') ? 'http://example.com/' : '/').then(
        () => false,
        () => true,
      ),
    );
    expect(blocked).toBe(true);
    await expect
      .poll(() => frameErrors(frame))
      .toEqual([expect.stringMatching(/^csp: connect-src/)]);
  });

  for (const entry of catalogue.explainers) {
    test(`${entry.slug}: mounts, renders, controller works, disposes`, async ({ page }) => {
      const problems = watchConsole(page);
      const frame = await openHarness(page);
      const start = entry.chapters[1] ?? entry.chapters[0]!;

      const mounted = await wmit<Mounted>(frame, 'mount', entry.slug, {
        chapter: start.id,
        autoplay: true,
        ui: true,
      });
      expect(mounted.apiVersion).toBe(1);
      expect(mounted.slug).toBe(entry.slug);

      expect(mounted.ui?.dock).toBe(true);
      const ui = await wmit<SiteUiDom>(frame, 'siteUi');
      expect(ui.dockVisible).toBe(true);
      expect(ui.phases).toEqual(mounted.info.phases.map((p) => p.label));
      expect(ui.pressed).toEqual([
        mounted.info.phases.find((p) => p.id === mounted.state.phaseId)!.label,
      ]);
      expect(ui.speed).toMatchObject({
        min: mounted.info.speed.min,
        max: mounted.info.speed.max,
        step: mounted.info.speed.step,
      });
      expect(ui.speedLabel).toBe(mounted.info.speed.label);
      expect(ui.speedValue).toBeTruthy();
      expect(ui.play).toMatch(/^(Play|Pause)$/);
      expect(ui.slots).toEqual(mounted.ui?.gauge ? ['dock-slot', 'gauge-slot'] : ['dock-slot']);
      expect(ui.readouts.length > 0).toBe(mounted.ui?.gauge);
      expect(ui.texts, `${entry.slug}: untranslated key in the site controls`).not.toMatch(
        /\b(controls|stage|timeline|readouts)\.[\w.]+/,
      );

      const { info, state } = mounted;
      expect(info.title).toBe(entry.title);
      expect(info.eyebrow).toBe(entry.eyebrow);
      expect(info.tagline).toBe(entry.tagline);
      expect(info.chapters.map((c) => c.id)).toEqual(entry.chapters.map((c) => c.id));
      expect(info.chapters.map((c) => c.title)).toEqual(entry.chapters.map((c) => c.title));
      expect(info.chapters.map((c) => c.paragraphsHtml)).toEqual(
        entry.chapters.map((c) => c.paragraphs.map((p) => p.html)),
      );
      expect(info.phases.length).toBeGreaterThan(0);
      for (const p of info.phases) expect(p.label).not.toMatch(/^timeline\./);

      expect(state.chapter).toBe(start.id);

      await page.waitForTimeout(300);
      expect(await paintedShare(page, frame), 'canvas looks blank').toBeGreaterThan(0.01);
      const labels = await wmit<string[]>(frame, 'labels');
      expect(labels.length, `${entry.slug}: no part labels in the DOM`).toBeGreaterThan(0);
      expectEnglishLabels(labels, entry);
      await frame
        .locator('#viewport')
        .screenshot({ path: test.info().outputPath(`${entry.slug}.png`) });
      const dom = await wmit<{ canvases: number; styles: string[]; core: number; scene: string }>(
        frame,
        'dom',
      );
      expect(dom).toMatchObject({ canvases: 1, styles: [entry.slug], core: 1, scene: entry.slug });

      await wmit(frame, 'call', 'pause');
      let s = await wmit<EmbedState>(frame, 'state');
      expect(s.playing).toBe(false);

      const target = entry.chapters[2] ?? entry.chapters[0]!;
      s = await wmit<EmbedState>(frame, 'call', 'setChapter', target.id);
      expect(s.chapter).toBe(target.id);
      expect((await wmit<EmbedState>(frame, 'lastNotified'))?.chapter).toBe(target.id);

      await wmit(frame, 'call', 'pause');
      const toggled = await wmit<boolean>(frame, 'call', 'togglePlaying').then(
        (x) => (x as unknown as EmbedState).playing,
      );
      expect(toggled).toBe(true);
      expect((await wmit<EmbedState>(frame, 'lastNotified'))?.playing).toBe(true);
      s = await wmit<EmbedState>(frame, 'call', 'togglePlaying');
      expect(s.playing).toBe(false);

      s = await wmit<EmbedState>(frame, 'call', 'seek', 0.5);
      expect(s.progress).toBeCloseTo(0.5, 2);
      expect(s.phase).toBeCloseTo(info.cycle * 0.5, 4);
      expect(info.phases.map((p) => p.id)).toContain(s.phaseId);
      expect((await wmit<EmbedState>(frame, 'lastNotified'))?.progress).toBeCloseTo(0.5, 2);

      const toggle = info.toggles[0];
      if (toggle) {
        const before = s.view[toggle.id] ?? false;
        s = await wmit<EmbedState>(frame, 'call', 'setView', toggle.id, !before);
        expect(s.view[toggle.id]).toBe(!before);
        expect((await wmit<EmbedState>(frame, 'lastNotified'))?.view[toggle.id]).toBe(!before);
      }

      for (const choice of info.choices) {
        const current = s.choices[choice.id];
        const other = choice.options.find((o) => o.value !== current);
        if (!other) continue;
        s = await wmit<EmbedState>(frame, 'call', 'setChoice', choice.id, other.value);
        expect(s.choices[choice.id], `${entry.slug}: choice ${choice.id}`).toBe(other.value);
        expect((await wmit<EmbedState>(frame, 'lastNotified'))?.choices[choice.id]).toBe(
          other.value,
        );
      }

      s = await wmit<EmbedState>(frame, 'call', 'setSpeed', info.speed.max);
      expect(s.speed).toBe(info.speed.max);

      const last = info.phases.length - 1;
      s = await wmit<EmbedState>(frame, 'clickPhase', last);
      expect(s.phaseId).toBe(info.phases[last]!.id);
      s = await wmit<EmbedState>(frame, 'inputSpeed', info.speed.min);
      expect(s.speed).toBe(info.speed.min);
      await expect
        .poll(() => wmit<SiteUiDom>(frame, 'siteUi').then((u) => u.pressed))
        .toEqual([info.phases[last]!.label]);
      await wmit(frame, 'call', 'resetCamera');
      await page.waitForTimeout(100);

      const disposed = await wmit<{ contextLost: boolean | null }>(frame, 'dispose');
      expect(disposed.contextLost).toBe(true);
      expect(await wmit(frame, 'dom')).toMatchObject({
        canvases: 0,
        styles: [],
        core: 0,
        scene: null,
      });
      expect(await wmit<SiteUiDom>(frame, 'siteUi')).toMatchObject({
        slots: [],
        phases: [],
        readouts: [],
      });

      expect(await frameErrors(frame)).toEqual([]);
      expect(problems).toEqual([]);
    });
  }

  test('mri → engine → heart → mri ×3: no context leaks, no foreign labels', async ({ page }) => {
    test.setTimeout(240_000);
    const problems = watchConsole(page);
    const frame = await openHarness(page);
    for (let round = 0; round < 3; round++) {
      for (const slug of ['mri-scanner', 'engine', 'heart', 'mri-scanner']) {
        const entry = bySlug.get(slug)!;
        const mounted = await wmit<Mounted>(frame, 'mount', slug, { ui: round !== 1 });
        expect(mounted.info.title).toBe(entry.title);
        expect(mounted.state.chapter).toBe(entry.chapters[0]!.id);
        expect(mounted.info.chapters[0]!.title).toBe(entry.chapters[0]!.title);
        expectEnglishLabels(await wmit<string[]>(frame, 'labels'), entry);
        expect(await wmit(frame, 'dom')).toMatchObject({ canvases: 1, styles: [slug] });
        const { contextLost } = await wmit<{ contextLost: boolean | null }>(frame, 'dispose');
        expect(contextLost).toBe(true);
      }
    }
    expect(await paintedShare(page, frame)).toBeLessThan(0.01);
    expect(await frameErrors(frame)).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('mounts in the language it is asked for', async ({ page }) => {
    const problems = watchConsole(page);
    const frame = await openHarness(page);
    const entry = bySlug.get('engine')!;
    const mounted = await wmit<Mounted>(frame, 'mount', 'engine', { ui: true, language: 'de-AT' });
    expectTranslated(mounted.info, entry, 'de');
    const t = translator('engine', 'de');
    const ui = await wmit<SiteUiDom>(frame, 'siteUi');
    expect(ui.phases).toEqual(mounted.info.phases.map((p) => p.label));
    expect([t('controls.play'), t('controls.pause')]).toContain(ui.play);
    expect(ui.texts).not.toMatch(/\b(controls|stage|timeline|readouts)\.[\w.]+/);
    expect(await wmit(frame, 'langs')).toEqual(['de', 'de', 'de']);
    const labels = await wmit<string[]>(frame, 'labels');
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(label).not.toMatch(/^[a-z][\w-]*(\.[\w-]+)+$/);
    expect(await wmit<string[]>(frame, 'cyrillicFonts')).toEqual([]);
    await wmit(frame, 'dispose');
    expect(await wmit(frame, 'langs')).toEqual([null, null, null]);
    expect(await frameErrors(frame)).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('switches to Ukrainian in place and back to English', async ({ page }) => {
    const problems = watchConsole(page);
    const frame = await openHarness(page);
    const entry = bySlug.get('engine')!;
    const mounted = await wmit<Mounted>(frame, 'mount', 'engine', { ui: true });
    expect(mounted.info.language).toBe('en');
    expect(mounted.info.title).toBe(entry.title);
    expect(await wmit(frame, 'langs')).toEqual(['en', 'en', 'en']);

    const switched = await wmit<{ resolved: string; info: EmbedInfo; state: EmbedState }>(
      frame,
      'setLanguage',
      'uk',
    );
    expect(switched.resolved).toBe('uk');
    expectTranslated(switched.info, entry, 'uk');
    const t = translator('engine', 'uk');
    const ui = await wmit<SiteUiDom>(frame, 'siteUi');
    expect(ui.phases).toEqual(switched.info.phases.map((p) => p.label));
    expect([t('controls.play'), t('controls.pause')]).toContain(ui.play);
    expect(ui.speedLabel).toBe(switched.info.speed.label);
    expect(switched.state.phaseLabel).toBe(
      switched.info.phases.find((p) => p.id === switched.state.phaseId)!.label,
    );
    expect((await wmit<EmbedState>(frame, 'lastNotified'))?.phaseLabel).toBe(
      switched.state.phaseLabel,
    );
    expect(await wmit(frame, 'langs')).toEqual(['uk', 'uk', 'uk']);
    expect(await wmit<string[]>(frame, 'cyrillicFonts')).toEqual(
      expect.arrayContaining(['Inter Variable', 'JetBrains Mono']),
    );

    const back = await wmit<{ resolved: string; info: EmbedInfo }>(frame, 'setLanguage', 'ru');
    expect(back.resolved).toBe('en');
    expect(back.info.title).toBe(entry.title);
    expect((await wmit<SiteUiDom>(frame, 'siteUi')).play).toMatch(/^(Play|Pause)$/);
    expect(await wmit(frame, 'langs')).toEqual(['en', 'en', 'en']);
    await wmit(frame, 'dispose');
    expect(await frameErrors(frame)).toEqual([]);
    expect(problems).toEqual([]);
  });
});
