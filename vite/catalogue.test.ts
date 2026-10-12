import { describe, expect, it } from 'vitest';
import { parse } from 'node-html-parser';
import { resolve } from 'node:path';
import { LANGUAGE_CODES } from '../src/core/i18n/languages.ts';
import type { Dictionary } from '../src/core/i18n/resources.ts';
import { buildCatalogue, extractChapters } from './catalogue.ts';
import { localizeEntry, plainText } from './catalogueModel.ts';
import type { CatalogueEntry } from './catalogueModel.ts';
import { loadExplainers } from './manifest.ts';

const root = resolve(__dirname, '..');

describe('plainText', () => {
  it('strips tags, decodes entities, collapses whitespace', () => {
    expect(plainText('A <strong>big</strong>\n   magnet &amp; a <em>coil</em>&nbsp;here')).toBe(
      'A big magnet & a coil here'.replace(/\s+/g, ' '),
    );
  });

  it('decodes numeric entities and keeps a bare less-than sign', () => {
    expect(plainText('&#8804; 3 &#x2192; &lt;b&gt; &unknown; < 2 g')).toBe(
      '≤ 3 → <b> &unknown; < 2 g',
    );
  });

  it('matches the html parser on every string of every explainer in every language', () => {
    const parsed = (html: string): string =>
      parse(`<div>${html}</div>`).text.replace(/\s+/g, ' ').trim();
    const leaves = (node: string | Dictionary): string[] =>
      typeof node === 'string' ? [node] : Object.values(node).flatMap(leaves);
    let count = 0;
    for (const loaded of loadExplainers(root)) {
      for (const [lang, dictionary] of Object.entries(loaded.dictionaries)) {
        for (const html of leaves(dictionary ?? {})) {
          expect(plainText(html), `${loaded.manifest.slug}/${lang}: ${html}`).toBe(parsed(html));
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThan(10_000);
  });
});

describe('extractChapters', () => {
  const en = {
    sections: {
      a: { title: 'First', p1: 'One <strong>x</strong>', p2: 'Two', path: 'nested, ignored' },
      b: { title: 'Second', p1: 'Three', aside: 'Aside' },
    },
  };
  const html = `
    <section class="chapter" data-preset="a">
      <h2 data-i18n="sections.a.title">First</h2>
      <p data-i18n-html="sections.a.p1">One</p>
      <p data-i18n="sections.a.p2">Two</p>
      <div><p data-i18n="sections.a.path">nested</p></div>
      <p data-i18n="chapters.a.other">not a sections key</p>
      <div class="range-widget"></div>
    </section>
    <section class="chapter keyboard-only" data-preset="b">
      <p data-i18n-html="sections.b.p1">Three</p>
      <p class="aside" data-i18n="sections.b.aside">Aside</p>
      <dl class="readouts"></dl><button data-action="x"></button><canvas data-canvas></canvas>
    </section>
    <section class="not-chapter" data-preset="c"></section>`;

  it('keeps section order, direct-child paragraphs with sections.<id>. keys only', () => {
    const chapters = extractChapters(html, en, 'test');
    expect(chapters.map((c) => [c.id, c.index, c.title])).toEqual([
      ['a', 1, 'First'],
      ['b', 2, 'Second'],
    ]);
    expect(chapters[0]!.paragraphs.map((p) => p.key)).toEqual(['sections.a.p1', 'sections.a.p2']);
    expect(chapters[0]!.paragraphs[0]).toEqual({
      key: 'sections.a.p1',
      html: 'One <strong>x</strong>',
    });
    expect(chapters[1]!.paragraphs.map((p) => p.key)).toEqual([
      'sections.b.p1',
      'sections.b.aside',
    ]);
    expect(chapters[0]!.interactive).toEqual({
      range: true,
      canvas: false,
      action: false,
      readouts: false,
    });
    expect(chapters[1]!.interactive).toEqual({
      range: false,
      canvas: true,
      action: true,
      readouts: true,
    });
  });

  it('fails on a missing en.json key', () => {
    expect(() =>
      extractChapters('<section class="chapter" data-preset="zz"></section>', en, 't'),
    ).toThrow(/sections\.zz\.title/);
  });
});

describe('catalogue from the explainers', () => {
  const catalogue = buildCatalogue(root, '2026-01-01T00:00:00.000Z');
  const bySlug = new Map(catalogue.explainers.map((e) => [e.slug, e]));

  it('has the expected chapter counts and first chapters', () => {
    for (const e of catalogue.explainers) {
      expect(e.chapters.length, e.slug).toBeGreaterThanOrEqual(4);
      expect(e.chapters.map((c) => c.index)).toEqual(e.chapters.map((_, i) => i + 1));
    }
    expect(bySlug.get('mri-scanner')?.chapters.map((c) => c.id)).toEqual([
      'overview',
      'magnet',
      'spins',
      'resonance',
      'gradients',
      'picture',
    ]);
    expect(bySlug.get('engine')?.chapters).toHaveLength(10);
    expect(bySlug.get('wind-farm')?.chapters[0]?.id).toBe('farm');
  });

  it('keeps plain text free of markup and links the cover on the site', () => {
    for (const e of catalogue.explainers) {
      expect(e.parts.length, e.slug).toBeGreaterThan(0);
      expect(e.cover).toMatch(new RegExp(`^\\.\\./\\.\\./${e.slug}/[\\w.-]+\\.webp$`));
      for (const c of e.chapters) {
        expect(c.paragraphs.length, `${e.slug}/${c.id}`).toBeGreaterThanOrEqual(1);
        for (const p of c.paragraphs) {
          expect(p.key.startsWith(`sections.${c.id}.`)).toBe(true);
          expect(Object.keys(p)).toEqual(['key', 'html']);
          expect(plainText(p.html)).not.toContain('<');
          expect(plainText(p.html)).not.toMatch(/&[a-z]+;/);
        }
      }
    }
  });

  it('carries every translation with the chapter ids of the English entry', () => {
    for (const e of catalogue.explainers) {
      for (const lang of LANGUAGE_CODES) {
        const localized = localizeEntry(e, lang);
        expect(localized.slug).toBe(e.slug);
        expect(localized.url).toBe(e.url);
        expect(localized.tags).toEqual(e.tags);
        expect(localized.chapters.map((c) => [c.id, c.index])).toEqual(
          e.chapters.map((c) => [c.id, c.index]),
        );
        if (lang !== 'en') expect(e.locales?.[lang]?.title, `${e.slug}/${lang}`).toBeTruthy();
      }
    }
  });

  it('localizes titles, texts and chapters', () => {
    const mri = bySlug.get('mri-scanner')!;
    const uk = localizeEntry(mri, 'uk');
    expect(uk.title).toMatch(/\p{Script=Cyrillic}/u);
    expect(uk.summary).toMatch(/\p{Script=Cyrillic}/u);
    expect(uk.chapters[1]!.title).toMatch(/\p{Script=Cyrillic}/u);
    expect(plainText(uk.chapters[1]!.paragraphs[0]!.html)).toMatch(/\p{Script=Cyrillic}/u);
    expect(uk.chapters[1]!.interactive).toEqual(mri.chapters[1]!.interactive);
    expect(localizeEntry(mri, 'ja').title).toMatch(/\p{Script=Han}|\p{Script=Katakana}/u);
    const { locales, ...english } = mri;
    expect(locales).toBeDefined();
    expect(localizeEntry(mri, 'en')).toEqual(english);
  });
});

describe('localizeEntry', () => {
  const entry: CatalogueEntry = {
    slug: 'x',
    title: 'Title',
    eyebrow: 'Eyebrow',
    tagline: 'Tagline',
    description: 'Description',
    summary: 'Summary',
    tags: ['energy'],
    topic: 'thing',
    url: 'https://example.com/x/',
    cover: 'cover.webp',
    parts: ['Part'],
    chapters: [
      {
        id: 'a',
        index: 1,
        title: 'First',
        paragraphs: [
          { key: 'sections.a.p1', html: 'One' },
          { key: 'sections.a.p2', html: 'Two' },
        ],
        interactive: { range: false, canvas: false, action: false, readouts: false },
      },
      {
        id: 'b',
        index: 2,
        title: 'Second',
        paragraphs: [{ key: 'sections.b.p1', html: 'Three' }],
        interactive: { range: true, canvas: false, action: false, readouts: false },
      },
    ],
    locales: {
      uk: {
        title: 'Назва',
        chapters: [{ id: 'a', paragraphs: [{ key: 'sections.a.p2', html: 'Два' }] }],
      },
    },
  };

  it('falls back to English field by field', () => {
    const uk = localizeEntry(entry, 'uk');
    expect(uk.title).toBe('Назва');
    expect(uk.summary).toBe('Summary');
    expect(uk.parts).toEqual(['Part']);
    expect(uk.chapters.map((c) => c.title)).toEqual(['First', 'Second']);
    expect(uk.chapters[0]!.paragraphs.map((p) => p.html)).toEqual(['One', 'Два']);
    expect(uk.chapters[1]!.paragraphs.map((p) => p.html)).toEqual(['Three']);
    expect('locales' in uk).toBe(false);
  });

  it('serves English for a language without a translation', () => {
    expect(localizeEntry(entry, 'de').title).toBe('Title');
    expect(localizeEntry({ ...entry, locales: {} }, 'uk').title).toBe('Title');
  });
});
