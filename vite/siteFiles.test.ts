import { describe, expect, it } from 'vitest';
import type { LoadedAbout } from './about.ts';
import { siteFiles } from './siteFiles.ts';

const about: LoadedAbout = {
  template: '',
  dictionaries: {},
  dates: { published: '2026-02-01T09:00:00+02:00', modified: '2026-03-20T09:00:00+02:00' },
};

describe('siteFiles', () => {
  it('serves the crawl files and one feed per language', () => {
    expect(
      siteFiles({ explainers: [], about, core: {} }).map(({ fileName, contentType }) => [
        fileName,
        contentType,
      ]),
    ).toEqual([
      ['sitemap.xml', 'application/xml; charset=utf-8'],
      ['robots.txt', 'text/plain; charset=utf-8'],
      ...['', 'zh/', 'es/', 'uk/', 'pt/', 'fr/', 'de/', 'ja/'].map((prefix) => [
        `${prefix}feed.xml`,
        'application/rss+xml; charset=utf-8',
      ]),
    ]);
  });
});
