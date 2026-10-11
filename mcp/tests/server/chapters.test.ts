import { describe, expect, it } from 'vitest';
import { resolveChapter, tokens } from '../../server/chapters.ts';
import { catalogues, fixture } from './helpers.ts';

const mri = fixture.explainers.find((e) => e.slug === 'mri-scanner')!;
const engine = fixture.explainers.find((e) => e.slug === 'engine')!;

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

  it.each(catalogues)(
    'resolves every chapter of the %s catalogue by id, number and title',
    (_name, cat) => {
      for (const e of cat.explainers) {
        for (const c of e.chapters) {
          expect(resolveChapter(e, c.id).chapter.id).toBe(c.id);
          expect(resolveChapter(e, String(c.index)).chapter.id).toBe(c.id);
          if (tokens(c.title).length > 0) expect(resolveChapter(e, c.title).chapter.id).toBe(c.id);
        }
      }
    },
  );
});
