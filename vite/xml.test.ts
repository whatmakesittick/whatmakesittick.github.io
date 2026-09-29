import { describe, expect, it } from 'vitest';
import { xmlBlock, xmlDocument, xmlElement, xmlEmptyElement } from './xml.ts';

describe('xml helpers', () => {
  it('escapes text and attribute values', () => {
    expect(xmlElement('title', 'Gears & "springs"', { lang: 'a<b' })).toBe(
      '<title lang="a&lt;b">Gears &amp; &quot;springs&quot;</title>',
    );
    expect(xmlEmptyElement('link', { href: '/?a=1&b=2' })).toBe('<link href="/?a=1&amp;b=2" />');
  });

  it('nests children one level deeper than their parent', () => {
    const inner = xmlBlock('item', [xmlElement('title', 'Pump')]);
    expect(xmlBlock('channel', [inner], { version: '2.0' })).toBe(
      '<channel version="2.0">\n  <item>\n    <title>Pump</title>\n  </item>\n</channel>',
    );
  });

  it('opens a document with the xml declaration and ends it with a newline', () => {
    expect(xmlDocument('<rss />')).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<rss />\n');
  });
});
