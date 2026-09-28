import { describe, expect, it } from 'vitest';
import type { LoadedExplainer } from './manifest.ts';
import { CATALOGUE_ROUTE, catalogueRoute, siteRoutes } from './routes.ts';

function explainer(slug: string, modified: string): LoadedExplainer {
  const meta = { title: slug, eyebrow: '', tagline: '', description: '', summary: '' };
  return {
    manifest: {
      slug,
      tags: ['tools'],
      cover: 'cover.webp',
      entry: 'src/index.ts',
      chapters: 'chapters.html',
      locales: ['en'],
      social: { image: 'social/og-image.png', alt: slug },
    },
    directory: `/repo/explainers/${slug}`,
    meta,
    metas: { en: meta },
    dictionaries: {},
    chapters: '',
    dates: { published: '2026-01-01T09:00:00+02:00', modified },
  };
}

const explainers = [
  explainer('lock', '2026-03-10T09:00:00+02:00'),
  explainer('pump', '2026-04-02T01:00:00+03:00'),
  explainer('gear', '2026-04-01T23:30:00Z'),
];

describe('catalogueRoute', () => {
  it('dates the catalogue by the newest change to any explainer', () => {
    expect(catalogueRoute(explainers).modified).toBe('2026-04-01T23:30:00Z');
  });

  it('leaves the catalogue undated without explainers', () => {
    expect(catalogueRoute([])).toEqual(CATALOGUE_ROUTE);
  });
});

describe('siteRoutes', () => {
  it('lists the catalogue first and then every explainer with its own date', () => {
    expect(siteRoutes(explainers).map(({ page, modified }) => [page, modified])).toEqual([
      ['', '2026-04-01T23:30:00Z'],
      ['lock', '2026-03-10T09:00:00+02:00'],
      ['pump', '2026-04-02T01:00:00+03:00'],
      ['gear', '2026-04-01T23:30:00Z'],
    ]);
  });
});
