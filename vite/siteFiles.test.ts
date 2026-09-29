import { describe, expect, it } from 'vitest';
import { siteFiles } from './siteFiles.ts';

describe('siteFiles', () => {
  it('serves the crawl files and one feed per language', () => {
    expect(siteFiles([], {}).map(({ fileName, contentType }) => [fileName, contentType])).toEqual([
      ['sitemap.xml', 'application/xml; charset=utf-8'],
      ['robots.txt', 'text/plain; charset=utf-8'],
      ...['', 'zh/', 'es/', 'uk/', 'pt/', 'fr/', 'de/', 'ja/'].map((prefix) => [
        `${prefix}feed.xml`,
        'application/rss+xml; charset=utf-8',
      ]),
    ]);
  });
});
