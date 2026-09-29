import { describe, expect, it } from 'vitest';
import { siteFiles } from './siteFiles.ts';

describe('siteFiles', () => {
  it('serves the crawl files', () => {
    expect(siteFiles([]).map(({ fileName, contentType }) => [fileName, contentType])).toEqual([
      ['sitemap.xml', 'application/xml; charset=utf-8'],
      ['robots.txt', 'text/plain; charset=utf-8'],
    ]);
  });
});
