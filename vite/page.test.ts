import { describe, expect, it } from 'vitest';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { PageLanguage } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';
import { catalogueEntries, renderCatalogue, renderEntry, renderPage, siteValues } from './page.ts';

const meta = {
  title: 'How a "thing" works',
  eyebrow: 'Opened up',
  tagline: 'Slowed right down',
  description: 'A look inside <things>',
  summary: 'Short',
};
const ukrainianMeta = { ...meta, title: 'Як працює річ', description: 'Погляд усередину' };

const explainer: LoadedExplainer = {
  manifest: {
    slug: 'thing',
    tags: ['tools'],
    cover: 'cover.webp',
    entry: 'src/index.ts',
    chapters: 'chapters.html',
    locales: ['en', 'uk'],
    social: { image: 'social/card.png', alt: 'A thing' },
  },
  directory: '/repo/explainers/thing',
  meta,
  metas: { en: meta, uk: ukrainianMeta },
  dictionaries: {},
  dates: { published: '2026-01-10T09:00:00+02:00', modified: '2026-03-10T09:00:00+02:00' },
  chapters:
    '<section class="chapter" data-preset="intro">\n  <h2 data-i18n="sections.intro">Intro</h2>\n</section>',
};

const template = [
  '<html lang="{{lang}}">',
  '<title>{{title}}</title>',
  '<meta content="{{description}}" />',
  '<link rel="canonical" href="{{url}}" />',
  '{{alternateLinks}}',
  '<meta content="{{image}}" type="{{imageType}}" />',
  '{{localeTags}}',
  '<a href="{{sourceUrl}}">{{siteName}}</a>',
  '<a class="catalogue" href="{{catalogueUrl}}">{{siteName}}</a>',
  '<script type="application/ld+json">{{structuredData}}</script>',
  '<main>',
  '  {{chapters}}',
  '</main>',
  '<!-- partial:footer -->',
  '<script type="module" src="{{entry}}"></script>',
  '</html>',
].join('\n');

const partials = { footer: '<footer>{{licenseUrl}}</footer>' };

const translations: Record<string, string> = {
  'sections.intro': 'Вступ',
  'catalogue.title': 'Що змушує цокати',
  'catalogue.tagline': 'Як працюють машини',
};

function language(code: LanguageCode): PageLanguage {
  return { code, translate: (key) => (code === 'en' ? key : (translations[key] ?? key)) };
}

function structuredData(html: string): unknown {
  const start = html.indexOf('application/ld+json">') + 'application/ld+json">'.length;
  return JSON.parse(html.slice(start, html.indexOf('</script>', start)));
}

function hreflangs(html: string): string[] {
  return [...html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
    ([, code, href]) => `${code} ${href}`,
  );
}

describe('renderPage', () => {
  const html = renderPage(template, partials, explainer, language('en'));
  const ukrainian = renderPage(template, partials, explainer, language('uk'));

  it('escapes the explainer copy into the head', () => {
    expect(html).toContain('<title>How a &quot;thing&quot; works</title>');
    expect(html).toContain('content="A look inside &lt;things&gt;"');
  });

  it('points canonical and social tags at the explainer page', () => {
    expect(html).toContain('<link rel="canonical" href="https://whatmakesittick.github.io/thing/"');
    expect(html).toContain(
      'content="https://whatmakesittick.github.io/thing/social/card.png" type="image/png"',
    );
    expect(html).toContain('<meta property="og:locale" content="en_GB"');
    expect(html).toContain('<meta property="og:locale:alternate" content="uk_UA"');
  });

  it('links the source folder and fills the shared partials', () => {
    expect(html).toContain('/tree/main/explainers/thing">What makes it tick</a>');
    expect(html).toContain('<footer>https://github.com/whatmakesittick/');
  });

  it('links back to the catalogue in the language of the page', () => {
    expect(html).toContain('<a class="catalogue" href="/">');
    expect(ukrainian).toContain('<a class="catalogue" href="/uk/">');
  });

  it('inlines the chapters at the placeholder indentation', () => {
    expect(html).toContain('<main>\n  <section class="chapter" data-preset="intro">\n    <h2');
  });

  it('describes the page as structured data with its dates', () => {
    expect(structuredData(html)).toMatchObject({
      headline: meta.title,
      inLanguage: 'en',
      datePublished: explainer.dates.published,
      dateModified: explainer.dates.modified,
    });
  });

  it('loads the shared entry of the explainer from every language page', () => {
    expect(html).toContain('<script type="module" src="/thing/main.ts"></script>');
    expect(ukrainian).toContain('<script type="module" src="/thing/main.ts"></script>');
  });

  it('renders a language page in its language with a canonical link to itself', () => {
    expect(ukrainian).toContain('<html lang="uk">');
    expect(ukrainian).toContain('<title>Як працює річ</title>');
    expect(ukrainian).toContain(
      '<link rel="canonical" href="https://whatmakesittick.github.io/uk/thing/"',
    );
    expect(ukrainian).toContain('<meta property="og:locale" content="uk_UA"');
    expect(ukrainian).toContain('<meta property="og:locale:alternate" content="en_GB"');
    expect(structuredData(ukrainian)).toMatchObject({
      headline: 'Як працює річ',
      url: 'https://whatmakesittick.github.io/uk/thing/',
      inLanguage: 'uk',
    });
  });

  it('translates the marked copy and keeps the markers for the runtime', () => {
    expect(ukrainian).toContain('<h2 data-i18n="sections.intro">Вступ</h2>');
  });

  it('lists every language variant and the English page as the default', () => {
    const expected = [
      'en https://whatmakesittick.github.io/thing/',
      'uk https://whatmakesittick.github.io/uk/thing/',
      'x-default https://whatmakesittick.github.io/thing/',
    ];
    expect(hreflangs(html)).toEqual(expected);
    expect(hreflangs(ukrainian)).toEqual(expected);
  });
});

describe('renderCatalogue', () => {
  const catalogueTemplate = template.replace('{{chapters}}', '').replace('{{entry}}', '/main.ts');
  const gearbox: LoadedExplainer = {
    ...explainer,
    manifest: { ...explainer.manifest, slug: 'gearbox', tags: ['mechanics'], locales: ['en'] },
    metas: { en: { ...meta, title: 'How a gearbox works' } },
    dates: { published: '2026-02-01T09:00:00+02:00', modified: '2026-02-01T09:00:00+02:00' },
  };
  const html = renderCatalogue(catalogueTemplate, partials, [explainer, gearbox], language('uk'));

  it('renders the catalogue in the language of its folder', () => {
    expect(html).toContain('<html lang="uk">');
    expect(html).toContain('<title>Що змушує цокати</title>');
    expect(html).toContain('content="Як працюють машини"');
    expect(html).toContain('<link rel="canonical" href="https://whatmakesittick.github.io/uk/"');
    expect(html).toContain('content="https://whatmakesittick.github.io/social/og-image.png"');
    expect(html).toContain('<a class="catalogue" href="/uk/">');
  });

  it('lists the catalogue in every language', () => {
    expect(hreflangs(html)).toHaveLength(9);
    expect(hreflangs(html)).toContain('x-default https://whatmakesittick.github.io/');
    expect(hreflangs(html)).toContain('ja https://whatmakesittick.github.io/ja/');
  });

  it('describes the site and lists the explainers newest first as structured data', () => {
    expect(structuredData(html)).toMatchObject({
      '@graph': [
        { '@type': 'WebSite', url: 'https://whatmakesittick.github.io/uk/', inLanguage: 'uk' },
        {
          '@type': 'ItemList',
          numberOfItems: 2,
          itemListElement: [
            {
              position: 1,
              name: 'How a gearbox works',
              url: 'https://whatmakesittick.github.io/gearbox/',
            },
            {
              position: 2,
              name: 'Як працює річ',
              url: 'https://whatmakesittick.github.io/uk/thing/',
            },
          ],
        },
      ],
    });
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
  it('exposes the manifest, the meta of every language and the publish date', () => {
    const [entry] = catalogueEntries([explainer]);
    expect(entry.meta.uk?.title).toBe('Як працює річ');
    expect(entry.manifest.slug).toBe('thing');
    expect(entry.published).toBe(explainer.dates.published);
  });

  it('lists the newest explainer first', () => {
    const older = {
      ...explainer,
      manifest: { ...explainer.manifest, slug: 'older' },
      dates: { published: '2025-12-01T09:00:00+02:00', modified: '2025-12-01T09:00:00+02:00' },
    };
    const slugs = catalogueEntries([older, explainer]).map((entry) => entry.manifest.slug);
    expect(slugs).toEqual(['thing', 'older']);
  });
});

describe('siteValues', () => {
  it('fills the site name and links for the shared partials', () => {
    expect(siteValues('https://example.com/source')).toMatchObject({
      siteName: 'What makes it tick',
      licenseUrl: 'https://github.com/whatmakesittick/whatmakesittick.github.io/blob/main/LICENSE',
      sourceUrl: 'https://example.com/source',
    });
  });
});
