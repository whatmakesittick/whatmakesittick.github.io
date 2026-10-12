import { describe, expect, it, vi } from 'vitest';
import type { BakedCatalogue } from '../../shared/catalogue.ts';
import { STRINGS } from '../../widget/src/i18n/all.ts';
import { createPacks } from '../../widget/src/i18n/packs.ts';

const catalogue = (title: string): BakedCatalogue => ({
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

describe('language packs', () => {
  it('has English at hand without loading anything', async () => {
    const uk = vi.fn();
    const packs = createPacks(catalogue('Engine'), { uk });
    expect(packs.english.lang).toBe('en');
    expect(packs.english.strings.fullscreen).toBe('Show the model full screen');
    expect(packs.english.catalogue.explainers[0]?.title).toBe('Engine');
    expect(packs.ready('en')).toBe(packs.english);
    expect(await packs.load('en')).toBe(packs.english);
    expect(uk).not.toHaveBeenCalled();
  });

  it('loads a language once, with its catalogue and site strings', async () => {
    const uk = vi.fn(async () => ({
      catalogue: catalogue('Двигун'),
      core: { stage: { expand: 'Показати модель на весь екран' } },
      widget: STRINGS.uk,
    }));
    const packs = createPacks(catalogue('Engine'), { uk });
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
  });

  it('forgets a failed load so the next one retries', async () => {
    const de = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ catalogue: catalogue('Motor'), core: {}, widget: STRINGS.de });
    const packs = createPacks(catalogue('Engine'), { de });
    await expect(packs.load('de')).rejects.toThrow('offline');
    expect((await packs.load('de')).catalogue.explainers[0]?.title).toBe('Motor');
  });

  it('answers English for a language without a source', async () => {
    const packs = createPacks(catalogue('Engine'), {});
    expect(await packs.load('ja')).toBe(packs.english);
  });
});
