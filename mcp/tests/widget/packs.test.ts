import { describe, expect, it, vi } from 'vitest';
import type { WidgetCatalogue } from '../../shared/catalogue.ts';
import type { LanguageCode } from '../../../src/core/i18n/languages.ts';
import type { Catalogues } from '../../widget/src/catalogue.ts';
import { STRINGS } from '../../widget/src/i18n/all.ts';
import { createPacks } from '../../widget/src/i18n/packs.ts';

const catalogue = (title: string): WidgetCatalogue => ({
  explainers: [
    {
      slug: 'engine',
      title,
      eyebrow: '',
      summary: '',
      tags: [],
      cover: 'covers/engine.webp',
      chapters: [{ id: 'strokes', title }],
    },
  ],
  taglines: { engine: title },
});

const TITLES: Partial<Record<LanguageCode, string>> = { en: 'Engine', uk: 'Двигун', de: 'Motor' };

function memoryCatalogues(): Catalogues & { set(lang: LanguageCode, title: string): void } {
  const store = new Map<LanguageCode, WidgetCatalogue>();
  const next = new Map<LanguageCode, WidgetCatalogue>();
  return {
    ready: (lang) => store.get(lang),
    load: vi.fn(async (lang: LanguageCode) => {
      const title = TITLES[lang];
      if (!title) throw new Error(`no catalogue for ${lang}`);
      if (!store.has(lang)) store.set(lang, catalogue(title));
      return store.get(lang)!;
    }),
    async refresh(lang) {
      const fresh = next.get(lang);
      if (!fresh) return undefined;
      next.delete(lang);
      store.set(lang, fresh);
      return fresh;
    },
    set: (lang, title) => void next.set(lang, catalogue(title)),
  };
}

describe('language packs', () => {
  it('has the English strings at hand and loads the English catalogue', async () => {
    const uk = vi.fn();
    const packs = createPacks(memoryCatalogues(), { uk });
    expect(packs.englishStrings.fullscreen).toBe('Show the model full screen');
    expect(packs.ready('en')).toBeUndefined();
    const english = await packs.load('en');
    expect(english.lang).toBe('en');
    expect(english.catalogue.explainers[0]?.title).toBe('Engine');
    expect(packs.ready('en')).toBe(english);
    expect(await packs.load('en')).toBe(english);
    expect(uk).not.toHaveBeenCalled();
  });

  it('loads a language once, with its catalogue and site strings', async () => {
    const uk = vi.fn(async () => ({
      core: { stage: { expand: 'Показати модель на весь екран' } },
      widget: STRINGS.uk,
    }));
    const catalogues = memoryCatalogues();
    const packs = createPacks(catalogues, { uk });
    expect(packs.ready('uk')).toBeUndefined();
    const [a, b] = await Promise.all([packs.load('uk'), packs.load('uk')]);
    expect(a).toBe(b);
    expect(a.lang).toBe('uk');
    expect(a.catalogue.explainers[0]?.title).toBe('Двигун');
    expect(a.strings.fullscreen).toBe('Показати модель на весь екран');
    expect(a.strings.exitFullscreen).toBe('Вийти з повноекранного режиму');
    expect(a.strings.exploreMore).toBe('More explainers');
    expect(packs.ready('uk')).toBe(a);
    expect(uk).toHaveBeenCalledTimes(1);
    expect(catalogues.load).toHaveBeenCalledWith('uk');
    expect(catalogues.load).not.toHaveBeenCalledWith('en');
  });

  it('forgets a failed load so the next one retries', async () => {
    const de = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ core: {}, widget: STRINGS.de });
    const packs = createPacks(memoryCatalogues(), { de });
    await expect(packs.load('de')).rejects.toThrow('offline');
    expect((await packs.load('de')).catalogue.explainers[0]?.title).toBe('Motor');
  });

  it('takes the language from a fresh widget module when its chunk is gone', async () => {
    const de = vi.fn().mockRejectedValue(new TypeError('Failed to fetch widget-de-old.js'));
    const fresh = vi.fn(async () => ({ core: {}, widget: STRINGS.de }));
    const packs = createPacks(memoryCatalogues(), { de }, fresh);
    const pack = await packs.load('de');
    expect(pack.strings.exitFullscreen).toBe('Vollbild beenden');
    expect(fresh).toHaveBeenCalledWith('de');
    expect(packs.ready('de')).toBe(pack);
  });

  it('fails when the fresh widget module fails too, and tries again later', async () => {
    const de = vi.fn().mockRejectedValue(new TypeError('Failed to fetch widget-de-old.js'));
    const fresh = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch widget.js'))
      .mockResolvedValueOnce({ core: {}, widget: STRINGS.de });
    const packs = createPacks(memoryCatalogues(), { de }, fresh);
    await expect(packs.load('de')).rejects.toThrow('widget.js');
    expect(packs.ready('de')).toBeUndefined();
    expect((await packs.load('de')).catalogue.explainers[0]?.title).toBe('Motor');
  });

  it('answers English for a language without a source', async () => {
    const packs = createPacks(memoryCatalogues(), {});
    const english = await packs.load('en');
    expect(await packs.load('ja')).toBe(english);
    expect(packs.ready('ja')).toBe(english);
  });

  it('gives a new pack when the catalogue changed, and nothing when it did not', async () => {
    const catalogues = memoryCatalogues();
    const packs = createPacks(catalogues, {});
    const before = await packs.load('en');
    expect(await packs.refresh('en')).toBeUndefined();
    catalogues.set('en', 'Engine 2');
    const after = await packs.refresh('en');
    expect(after).not.toBe(before);
    expect(after?.catalogue.explainers[0]?.title).toBe('Engine 2');
    expect(after?.strings).toBe(before.strings);
    expect(packs.ready('en')).toBe(after);
  });
});
