import { describe, expect, it } from 'vitest';
import { compareNewestFirst } from './manifest';
import type { CatalogueEntry } from './manifest';

function entry(slug: string, published: string): CatalogueEntry {
  return {
    manifest: {
      slug,
      tags: ['mechanics'],
      cover: 'cover.webp',
      entry: 'src/index.ts',
      chapters: 'chapters.html',
      locales: ['en'],
      social: { image: 'social/og-image.png', alt: 'Card' },
    },
    meta: {},
    published,
  };
}

describe('compareNewestFirst', () => {
  it('puts the latest publish date first across time zones', () => {
    const kyiv = entry('kyiv', '2026-03-10T09:00:00+02:00');
    const london = entry('london', '2026-03-10T08:30:00+00:00');
    const sorted = [kyiv, london].sort(compareNewestFirst);
    expect(sorted.map(({ manifest }) => manifest.slug)).toEqual(['london', 'kyiv']);
  });

  it('orders explainers published at the same moment by slug', () => {
    const date = '2026-03-10T09:00:00Z';
    const sorted = [entry('glider', date), entry('engine', date)].sort(compareNewestFirst);
    expect(sorted.map(({ manifest }) => manifest.slug)).toEqual(['engine', 'glider']);
  });
});
