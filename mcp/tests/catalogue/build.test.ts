import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import topics from '../../data/topics.json' with { type: 'json' };
import { toBakedCatalogue, toWidgetCatalogue } from '../../catalogue/build.ts';
import { LANGUAGE_CODES } from '../../../src/core/i18n/languages.ts';
import { resolveLanguage as coreResolveLanguage } from '../../../src/core/i18n/embedded.ts';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import { localizeEntry, resolveLanguage } from '../../shared/catalogue.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('catalogue for the MCP server and the widget', () => {
  const catalogue = buildCatalogue(root, '2026-01-01T00:00:00.000Z');
  const bySlug = new Map(catalogue.explainers.map((e) => [e.slug, e]));

  it('lists every explainer with a topic for the tool description', () => {
    expect(catalogue.explainers.length).toBeGreaterThanOrEqual(18);
    expect(Object.keys(topics).sort()).toEqual(catalogue.explainers.map((e) => e.slug).sort());
  });

  it('keeps the widget catalogue thin', () => {
    const thin = toWidgetCatalogue(catalogue);
    expect(thin.explainers).toHaveLength(catalogue.explainers.length);
    expect(JSON.stringify(thin).length).toBeLessThan(20_000);
  });

  it.each(LANGUAGE_CODES)('keeps the %s widget catalogue thin and in that language', (lang) => {
    const thin = toWidgetCatalogue(catalogue, lang);
    expect(thin.explainers.map((e) => e.slug)).toEqual(catalogue.explainers.map((e) => e.slug));
    expect(JSON.stringify(thin).length).toBeLessThan(20_000);
    const mri = thin.explainers.find((e) => e.slug === 'mri-scanner')!;
    const localized = localizeEntry(bySlug.get('mri-scanner')!, lang);
    expect(mri.title).toBe(localized.title);
    expect(mri.chapters.map((c) => c.id)).toEqual(localized.chapters.map((c) => c.id));
  });

  it('bakes the taglines in the widget language', () => {
    const baked = toBakedCatalogue(catalogue, 'uk');
    expect(baked.explainers).toEqual(toWidgetCatalogue(catalogue, 'uk').explainers);
    expect(baked.taglines['mri-scanner']).toBe(
      localizeEntry(bySlug.get('mri-scanner')!, 'uk').tagline,
    );
    expect(JSON.stringify(baked).length).toBeLessThan(20_000);
  });
});

describe('resolveLanguage', () => {
  it.each([
    [undefined, 'en'],
    ['', 'en'],
    ['uk', 'uk'],
    ['UK', 'uk'],
    ['de-AT', 'de'],
    ['pt_BR', 'pt'],
    ['zh-Hans-CN', 'zh'],
    ['ru', 'en'],
    ['en-US', 'en'],
    ['klingon', 'en'],
    [' DE ', 'de'],
    ['xx-de', 'en'],
  ] as const)('%j → %s, as the embed resolves it', (raw, lang) => {
    expect(resolveLanguage(raw)).toBe(lang);
    expect(coreResolveLanguage(raw)).toBe(lang);
  });
});
