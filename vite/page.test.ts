import { describe, expect, it } from 'vitest';
import type { LoadedExplainer } from './manifest.ts';
import { catalogueEntries, renderEntry, renderPage, siteValues } from './page.ts';

const meta = {
  title: 'How a "thing" works',
  eyebrow: 'Opened up',
  tagline: 'Slowed right down',
  description: 'A look inside <things>',
  summary: 'Short',
};

const explainer: LoadedExplainer = {
  manifest: {
    slug: 'thing',
    category: 'tools',
    cover: 'cover.webp',
    entry: 'src/index.ts',
    chapters: 'chapters.html',
    locales: ['en', 'uk'],
    social: { image: 'social/card.png', alt: 'A thing' },
  },
  directory: '/repo/explainers/thing',
  meta,
  metas: { en: meta, uk: { ...meta, title: 'Як працює річ' } },
  chapters: '<section class="chapter" data-preset="intro">\n  <h2>Intro</h2>\n</section>',
};

const template = [
  '<title>{{title}}</title>',
  '<meta content="{{description}}" />',
  '<link rel="canonical" href="{{url}}" />',
  '<meta content="{{image}}" type="{{imageType}}" />',
  '{{localeTags}}',
  '<a href="{{sourceUrl}}">{{siteName}}</a>',
  '<script>{{structuredData}}</script>',
  '<main>',
  '  {{chapters}}',
  '</main>',
  '<!-- partial:footer -->',
].join('\n');

describe('renderPage', () => {
  const html = renderPage(template, { footer: '<footer>{{licenseUrl}}</footer>' }, explainer);

  it('escapes the explainer copy into the head', () => {
    expect(html).toContain('<title>How a &quot;thing&quot; works</title>');
    expect(html).toContain('content="A look inside &lt;things&gt;"');
  });

  it('points canonical and social tags at the explainer page', () => {
    expect(html).toContain('href="https://whatmakesittick.github.io/thing/"');
    expect(html).toContain(
      'content="https://whatmakesittick.github.io/thing/social/card.png" type="image/png"',
    );
    expect(html).toContain('<meta property="og:locale" content="en_GB" />');
    expect(html).toContain('<meta property="og:locale:alternate" content="uk_UA" />');
  });

  it('links the source folder and fills the shared partials', () => {
    expect(html).toContain('/tree/main/explainers/thing">What makes it tick</a>');
    expect(html).toContain('<footer>https://github.com/whatmakesittick/');
  });

  it('inlines the chapters at the placeholder indentation', () => {
    expect(html).toContain('<main>\n  <section class="chapter" data-preset="intro">\n    <h2>');
  });

  it('describes the page as structured data', () => {
    const json = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
    expect(JSON.parse(json)).toMatchObject({ headline: meta.title, inLanguage: 'en' });
  });
});

describe('renderEntry', () => {
  it('bundles the English locale and loads every other shipped locale on demand', () => {
    expect(renderEntry(explainer.manifest)).toBe(
      [
        "import { mountExplainer } from '@core/mount';",
        "import explainer from '../explainers/thing/src/index.ts';",
        "import en from '../explainers/thing/locales/en.json';",
        '',
        'await mountExplainer(explainer, {',
        '  en: () => Promise.resolve(en),',
        "  uk: () => import('../explainers/thing/locales/uk.json').then((module) => module.default),",
        '});',
        '',
      ].join('\n'),
    );
  });
});

describe('catalogueEntries', () => {
  it('exposes the manifest and the meta of every language', () => {
    const [entry] = catalogueEntries([explainer]);
    expect(entry.meta.uk?.title).toBe('Як працює річ');
    expect(entry.manifest.slug).toBe('thing');
  });
});

describe('siteValues', () => {
  it('fills the site address and name for the catalogue head', () => {
    expect(siteValues('https://example.com/source')).toMatchObject({
      siteUrl: 'https://whatmakesittick.github.io/',
      siteName: 'What makes it tick',
      sourceUrl: 'https://example.com/source',
    });
  });
});
