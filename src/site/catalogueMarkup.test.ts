import { describe, expect, it } from 'vitest';
import type { Tag } from '../core/manifest.ts';
import type { CatalogueCard } from './catalogue.ts';
import { coverImage, explainerHref, renderCatalogueGrid } from './catalogueMarkup.ts';

function card(
  slug: string,
  tags: Tag[],
  locales: CatalogueCard['manifest']['locales'],
): CatalogueCard {
  const meta = { title: `How a ${slug} works`, eyebrow: 'Opened up', summary: 'A "short" <look>' };
  return {
    manifest: { slug, tags, cover: 'cover.webp', locales },
    meta: { en: meta, uk: { ...meta, title: `Як працює ${slug}` } },
    published: '2026-03-10T09:00:00Z',
  };
}

const cards = [
  card('watch', ['mechanics', 'tools'], ['en', 'uk']),
  card('glider', ['aircraft', 'flight'], ['en']),
  card('engine', ['engines', 'mechanics'], ['en', 'uk']),
  card('pump', ['home'], ['en', 'uk']),
];
const context = { code: 'uk', base: '/', translate: (key: string) => `[${key}]` } as const;
const html = renderCatalogueGrid(cards, context);

function covers(markup: string): string[] {
  return [...markup.matchAll(/<img [^>]*>/g)].map(([image]) => image);
}

describe('renderCatalogueGrid', () => {
  it('links every card to its page in the page language or in English', () => {
    const links = [...html.matchAll(/<a class="card" href="([^"]+)"/g)].map(([, href]) => href);
    expect(links).toEqual(['/uk/watch/', '/glider/', '/uk/engine/', '/uk/pump/']);
  });

  it('writes the localized copy escaped', () => {
    expect(html).toContain('<h2 class="card-title">Як працює watch</h2>');
    expect(html).toContain('<span class="card-summary">A &quot;short&quot; &lt;look&gt;</span>');
  });

  it('sizes every cover and loads only the first three eagerly', () => {
    const images = covers(html);
    expect(images).toHaveLength(4);
    images.forEach((image) => expect(image).toContain('width="932" height="699" decoding="async"'));
    expect(images.slice(0, 3).every((image) => image.includes('fetchpriority="high"'))).toBe(true);
    expect(images[3]).toContain('loading="lazy"');
    expect(images[3]).not.toContain('fetchpriority');
  });

  it('offers every used tag with everything shown', () => {
    const chips = [
      ...html
        .slice(0, html.indexOf('<ul'))
        .matchAll(/data-tag="([^"]*)" aria-pressed="(\w+)">([^<]+)</g),
    ].map(([, tag, pressed, label]) => `${tag}:${pressed}:${label}`);
    expect(chips).toEqual([
      ':true:[catalogue.allTags]',
      'mechanics:false:[catalogue.tags.mechanics]',
      'engines:false:[catalogue.tags.engines]',
      'aircraft:false:[catalogue.tags.aircraft]',
      'flight:false:[catalogue.tags.flight]',
      'home:false:[catalogue.tags.home]',
      'tools:false:[catalogue.tags.tools]',
    ]);
  });

  it('marks the grid with its language and ends it with the placeholder', () => {
    expect(html).toContain('<ul class="cards" data-language="uk">');
    expect(html).toMatch(/<li class="card-placeholder">\[catalogue.moreSoon\]<\/li><\/ul>$/);
  });
});

describe('explainerHref', () => {
  it('adds the base path', () => {
    expect(explainerHref(cards[0], 'uk', '/tick/')).toBe('/tick/uk/watch/');
    expect(explainerHref(cards[1], 'uk', '/tick/')).toBe('/tick/glider/');
  });
});

describe('coverImage', () => {
  it('points at the cover of the explainer', () => {
    expect(coverImage(cards[1], 'Glider', '/', 'lazy').html).toBe(
      '<img src="/glider/cover.webp" alt="Glider" width="932" height="699" decoding="async" loading="lazy">',
    );
  });
});
