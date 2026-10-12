import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '../../../src/core/i18n/languages.ts';
import { localizeEntry } from '../../shared/catalogue.ts';
import { resolveChapter, tokens } from '../../server/chapters.ts';
import { catalogue } from './helpers.ts';

const mri = catalogue.explainers.find((e) => e.slug === 'mri-scanner')!;
const engine = catalogue.explainers.find((e) => e.slug === 'engine')!;

describe('resolveChapter', () => {
  it.each([
    ['magnet', 'id'],
    ['MAGNET', 'id'],
    ['2', 'number'],
    ['chapter 2', 'number'],
    ['the magnet', 'title'],
    ['a magnet that never switches off', 'title'],
  ])('mri-scanner %j → magnet (%s)', (query, match) => {
    expect(resolveChapter(mri, query)).toMatchObject({ chapter: { id: 'magnet' }, match });
  });

  it('defaults to the first chapter without a query', () => {
    expect(resolveChapter(mri, undefined)).toMatchObject({
      chapter: { id: 'overview' },
      match: 'default',
    });
    expect(resolveChapter(mri, '  ')).toMatchObject({
      chapter: { id: 'overview' },
      match: 'default',
    });
  });

  it('falls back to the first chapter for an unknown chapter or number', () => {
    expect(resolveChapter(mri, 'toaster')).toMatchObject({
      chapter: { id: 'overview' },
      match: 'fallback',
    });
    expect(resolveChapter(mri, '42')).toMatchObject({
      chapter: { id: 'overview' },
      match: 'fallback',
    });
    expect(resolveChapter(mri, 'the')).toMatchObject({ match: 'fallback' });
  });

  it('matches title words', () => {
    expect(resolveChapter(mri, 'radio pulse').chapter.id).toBe('resonance');
    expect(resolveChapter(mri, 'gradient coils').chapter.id).toBe('gradients');
    expect(resolveChapter(engine, 'petrol or diesel').chapter.id).toBe('fuel');
    expect(resolveChapter(engine, '4 cylinders').chapter.id).toBe('inline4');
  });

  it('resolves every chapter of the site by id, number and title', () => {
    for (const e of catalogue.explainers) {
      for (const c of e.chapters) {
        expect(resolveChapter(e, c.id).chapter.id).toBe(c.id);
        expect(resolveChapter(e, String(c.index)).chapter.id).toBe(c.id);
        if (tokens(c.title).length > 0) expect(resolveChapter(e, c.title).chapter.id).toBe(c.id);
      }
    }
  });
});

describe('tokens', () => {
  it('keeps letters and digits of every script', () => {
    expect(tokens('Магніт, що ніколи не вимикається')).toEqual([
      'магніт',
      'що',
      'ніколи',
      'не',
      'вимикається',
    ]);
    expect(tokens('Wasserstoff neigt sich')).toEqual(['wasserstoff', 'neigt', 'sich']);
    expect(tokens('Ein Röhre')).toContain('röhre');
  });
});

describe('resolveChapter in other languages', () => {
  it('returns the chapter in the language asked for', () => {
    const res = resolveChapter(mri, 'magnet', 'uk');
    expect(res).toMatchObject({ match: 'id', chapter: { id: 'magnet', index: 2 } });
    expect(res.chapter.title).toBe(localizeEntry(mri, 'uk').chapters[1]!.title);
  });

  it.each([
    ['uk', 'магніт', 'magnet'],
    ['uk', 'Котушки', 'gradients'],
    ['uk', 'радіоімпульс', 'resonance'],
    ['de', 'Spulen', 'gradients'],
    ['de', 'the magnet', 'magnet'],
    ['ja', '磁石', 'magnet'],
    ['ja', 'コイル', 'gradients'],
    ['zh', '磁体', 'magnet'],
    ['zh', '线圈', 'gradients'],
    ['zh', '从回波到图像', 'picture'],
  ] as const)('%s %j → %s', (lang, query, id) => {
    expect(resolveChapter(mri, query, lang)).toMatchObject({ chapter: { id }, match: 'title' });
  });

  it('still falls back for words that match nothing', () => {
    expect(resolveChapter(mri, 'тостер', 'uk')).toMatchObject({
      chapter: { id: 'overview' },
      match: 'fallback',
    });
    expect(resolveChapter(mri, '烤面包机', 'zh')).toMatchObject({ match: 'fallback' });
  });

  it.each(LANGUAGE_CODES)('resolves every chapter by its %s title', (lang) => {
    for (const e of catalogue.explainers) {
      for (const c of localizeEntry(e, lang).chapters) {
        expect(resolveChapter(e, c.title, lang).chapter.id, `${e.slug}/${c.id}`).toBe(c.id);
      }
    }
  });
});
