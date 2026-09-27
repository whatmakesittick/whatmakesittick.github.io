import { describe, expect, it, vi } from 'vitest';
import { createDictionaryLoader, loadersByLanguage } from './loader';
import type { Dictionary } from './resources';

const resolve = (dictionary: Dictionary) => vi.fn(() => Promise.resolve(dictionary));

describe('createDictionaryLoader', () => {
  it('merges every source for a language and lets the later source win', async () => {
    const load = createDictionaryLoader([
      { uk: resolve({ controls: { play: 'Грати', pause: 'Пауза' } }) },
      { uk: resolve({ controls: { play: 'Запуск' } }) },
    ]);
    expect(await load('uk')).toEqual({ controls: { play: 'Запуск', pause: 'Пауза' } });
  });

  it('loads each language once', async () => {
    const uk = resolve({ a: 'А' });
    const load = createDictionaryLoader([{ uk }]);
    await Promise.all([load('uk'), load('uk')]);
    await load('uk');
    expect(uk).toHaveBeenCalledTimes(1);
  });

  it('gives an empty dictionary for a language no source ships', async () => {
    const load = createDictionaryLoader([{ en: resolve({ a: 'A' }) }]);
    expect(await load('de')).toEqual({});
  });

  it('tries again after a failed load', async () => {
    const uk = vi
      .fn<() => Promise<Dictionary>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ a: 'А' });
    const load = createDictionaryLoader([{ uk }]);
    await expect(load('uk')).rejects.toThrow('offline');
    expect(await load('uk')).toEqual({ a: 'А' });
  });
});

describe('loadersByLanguage', () => {
  it('keys locale files by their language code and skips unknown codes', () => {
    const de = resolve({});
    const it = resolve({});
    expect(loadersByLanguage({ '../locales/de.json': de, '../locales/it.json': it })).toEqual({
      de,
    });
  });
});
