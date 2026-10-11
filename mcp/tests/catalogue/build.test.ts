import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import aliases from '../../data/aliases.json' with { type: 'json' };
import {
  buildCatalogue,
  extractChapters,
  plainText,
  toWidgetCatalogue,
} from '../../catalogue/build.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('plainText', () => {
  it('strips tags, decodes entities, collapses whitespace', () => {
    expect(plainText('A <strong>big</strong>\n   magnet &amp; a <em>coil</em>&nbsp;here')).toBe(
      'A big magnet & a coil here'.replace(/\s+/g, ' '),
    );
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
      text: 'One x',
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

  it('lists every explainer with a topic for the tool description', () => {
    expect(catalogue.explainers.length).toBeGreaterThanOrEqual(18);
    expect(Object.keys(aliases).sort()).toEqual(catalogue.explainers.map((e) => e.slug).sort());
  });

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
          expect(p.text).not.toContain('<');
          expect(p.text).not.toMatch(/&[a-z]+;/);
        }
      }
    }
  });

  it('keeps the widget catalogue thin', () => {
    const thin = toWidgetCatalogue(catalogue);
    expect(thin.explainers).toHaveLength(catalogue.explainers.length);
    expect(JSON.stringify(thin).length).toBeLessThan(20_000);
  });
});
