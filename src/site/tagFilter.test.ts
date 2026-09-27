import { describe, expect, it } from 'vitest';
import type { CatalogueEntry, Tag } from '@core/manifest';
import { filterByTag, readTagQuery, toggleTag, usedTags, writeTagQuery } from './tagFilter';

function entry(slug: string, tags: Tag[]): CatalogueEntry {
  return {
    manifest: {
      slug,
      tags,
      cover: 'cover.webp',
      entry: 'src/index.ts',
      chapters: 'chapters.html',
      locales: ['en'],
      social: { image: 'social/og-image.png', alt: 'Card' },
    },
    meta: {},
    published: '2026-03-10T09:00:00Z',
  };
}

const engine = entry('engine', ['engines', 'mechanics', 'vehicles']);
const glider = entry('glider', ['aircraft', 'flight', 'physics', 'weather']);
const helicopter = entry('helicopter', ['aircraft', 'flight', 'mechanics']);
const entries = [engine, glider, helicopter];

function slugs(list: readonly CatalogueEntry[]): string[] {
  return list.map(({ manifest }) => manifest.slug);
}

describe('filterByTag', () => {
  it('shows every explainer without a selection', () => {
    expect(slugs(filterByTag(entries, undefined))).toEqual(['engine', 'glider', 'helicopter']);
  });

  it('keeps only the explainers with the selected tag, in their order', () => {
    expect(slugs(filterByTag(entries, 'flight'))).toEqual(['glider', 'helicopter']);
    expect(slugs(filterByTag(entries, 'mechanics'))).toEqual(['engine', 'helicopter']);
    expect(slugs(filterByTag(entries, 'optics'))).toEqual([]);
  });
});

describe('usedTags', () => {
  it('lists the tags at least one explainer uses in vocabulary order', () => {
    expect(usedTags([glider, engine])).toEqual([
      'mechanics',
      'engines',
      'vehicles',
      'aircraft',
      'flight',
      'physics',
      'weather',
    ]);
  });
});

describe('toggleTag', () => {
  it('selects a new tag and clears the one already selected', () => {
    expect(toggleTag(undefined, 'flight')).toBe('flight');
    expect(toggleTag('mechanics', 'flight')).toBe('flight');
    expect(toggleTag('flight', 'flight')).toBeUndefined();
    expect(toggleTag('flight', undefined)).toBeUndefined();
  });
});

describe('tag query', () => {
  const available = usedTags(entries);

  it('reads a tag the catalogue offers and ignores any other value', () => {
    expect(readTagQuery('?tag=flight', available)).toBe('flight');
    expect(readTagQuery('?lang=de&tag=mechanics', available)).toBe('mechanics');
    expect(readTagQuery('?tag=optics', available)).toBeUndefined();
    expect(readTagQuery('?tag=toys', available)).toBeUndefined();
    expect(readTagQuery('', available)).toBeUndefined();
  });

  it('writes the selection and keeps the other parameters', () => {
    expect(writeTagQuery('', 'flight')).toBe('?tag=flight');
    expect(writeTagQuery('?lang=de&tag=flight', 'mechanics')).toBe('?lang=de&tag=mechanics');
    expect(writeTagQuery('?lang=de&tag=flight', undefined)).toBe('?lang=de');
    expect(writeTagQuery('?tag=flight', undefined)).toBe('');
  });
});
