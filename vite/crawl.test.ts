import { describe, expect, it } from 'vitest';
import type { LoadedAbout } from './about.ts';
import { ROBOTS_FILE, SITEMAP_FILE, crawlFiles, renderRobots, renderSitemap } from './crawl.ts';

const about: LoadedAbout = {
  template: '',
  dictionaries: {},
  dates: { published: '2026-02-01T09:00:00+02:00', modified: '2026-03-20T09:00:00+02:00' },
};

const routes = [
  { page: '', languages: ['en', 'uk'] as const },
  { page: 'glider', languages: ['en', 'uk'] as const, modified: '2026-03-10T09:00:00+02:00' },
];

function entries(xml: string): string[] {
  return [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(([entry]) => entry);
}

describe('renderSitemap', () => {
  const xml = renderSitemap(routes);

  it('lists every page in every language', () => {
    expect(entries(xml).map((entry) => /<loc>(.*)<\/loc>/.exec(entry)?.[1])).toEqual([
      'https://whatmakesittick.github.io/',
      'https://whatmakesittick.github.io/uk/',
      'https://whatmakesittick.github.io/glider/',
      'https://whatmakesittick.github.io/uk/glider/',
    ]);
  });

  it('links each page to all of its language variants and the English default', () => {
    const [, ukrainianGlider] = entries(xml).slice(2);
    expect(ukrainianGlider).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://whatmakesittick.github.io/glider/" />',
    );
    expect(ukrainianGlider).toContain(
      'hreflang="uk" href="https://whatmakesittick.github.io/uk/glider/"',
    );
    expect(ukrainianGlider).toContain(
      'hreflang="x-default" href="https://whatmakesittick.github.io/glider/"',
    );
  });

  it('dates the pages that know when they last changed', () => {
    const [catalogue, , glider] = entries(xml);
    expect(catalogue).not.toContain('<lastmod>');
    expect(glider).toContain('<lastmod>2026-03-10T09:00:00+02:00</lastmod>');
  });

  it('declares the sitemap and xhtml namespaces', () => {
    expect(xml).toMatch(
      /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org/,
    );
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });
});

describe('renderRobots', () => {
  it('allows every crawler and points at the sitemap', () => {
    expect(renderRobots()).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://whatmakesittick.github.io/sitemap.xml\n',
    );
  });
});

describe('crawlFiles', () => {
  it('names both files with their content types', () => {
    expect(
      crawlFiles([], about).map(({ fileName, contentType }) => [fileName, contentType]),
    ).toEqual([
      [SITEMAP_FILE, 'application/xml; charset=utf-8'],
      [ROBOTS_FILE, 'text/plain; charset=utf-8'],
    ]);
  });
});
