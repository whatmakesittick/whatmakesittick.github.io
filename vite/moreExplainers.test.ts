import { describe, expect, it } from 'vitest';
import type { Tag } from '../src/core/manifest.ts';
import type { CatalogueCard } from '../src/site/catalogue.ts';
import { pickMoreExplainers, renderMoreExplainers } from './moreExplainers.ts';

function card(slug: string, tags: Tag[], locales: CatalogueCard['manifest']['locales'] = ['en']) {
  const meta = { title: `How a ${slug} works`, eyebrow: '', summary: '' };
  return {
    manifest: { slug, tags, cover: 'cover.webp', locales },
    meta: { en: meta, uk: { ...meta, title: `Як працює ${slug}` } },
    published: '2026-03-10T09:00:00Z',
  } satisfies CatalogueCard;
}

const newestFirst = [
  card('atp', ['biology', 'energy']),
  card('solar', ['energy', 'home'], ['en', 'uk']),
  card('watch', ['mechanics', 'tools']),
  card('rig', ['energy', 'earth']),
  card('glider', ['aircraft', 'flight']),
  card('engine', ['engines', 'mechanics', 'vehicles']),
];

function slugs(cards: readonly CatalogueCard[]): string[] {
  return cards.map(({ manifest }) => manifest.slug);
}

describe('pickMoreExplainers', () => {
  it('prefers the explainers sharing the most tags, the newest first among equals', () => {
    expect(slugs(pickMoreExplainers(newestFirst, newestFirst[5].manifest))).toEqual([
      'watch',
      'atp',
      'solar',
    ]);
    expect(
      slugs(pickMoreExplainers(newestFirst, card('lamp', ['energy', 'home']).manifest)),
    ).toEqual(['solar', 'atp', 'rig']);
  });

  it('fills up with the newest other explainers when few share a tag', () => {
    expect(slugs(pickMoreExplainers(newestFirst, newestFirst[4].manifest))).toEqual([
      'atp',
      'solar',
      'watch',
    ]);
  });

  it('never lists the page itself', () => {
    const more = pickMoreExplainers(newestFirst.slice(0, 2), newestFirst[0].manifest);
    expect(slugs(more)).toEqual(['solar']);
  });
});

describe('renderMoreExplainers', () => {
  const html = renderMoreExplainers(newestFirst.slice(0, 2), { code: 'uk', base: '/' });

  it('links each explainer in the page language when it ships it, else in English', () => {
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) => href);
    expect(links).toEqual(['/atp/', '/uk/solar/']);
    expect(html).toContain('<span class="more-explainer-title">Як працює solar</span>');
  });

  it('shows a sized, lazy cover that the title already names', () => {
    expect(html).toContain(
      '<img src="/solar/cover.webp" alt="" width="932" height="699" decoding="async" loading="lazy">',
    );
  });
});
