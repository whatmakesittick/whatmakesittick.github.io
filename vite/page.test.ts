import { describe, expect, it } from 'vitest';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { PageLanguage } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';
import {
  catalogueCards,
  redirectValues,
  renderCatalogue,
  renderEntry,
  renderNotFound,
  renderPage,
  siteValues,
} from './page.ts';
import { REDIRECT_SCRIPT } from './redirectScript.ts';

const meta = {
  title: 'How a "thing" works',
  eyebrow: 'Opened up',
  tagline: 'Slowed right down',
  description: 'A look inside <things>',
  summary: 'Short',
};
const ukrainianMeta = {
  ...meta,
  title: 'Як працює річ',
  description: 'Погляд усередину',
  socialAlt: 'Річ у розрізі',
};

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

const articleTags = [
  '<meta property="article:published_time" content="{{published}}" />',
  '<meta property="article:modified_time" content="{{modified}}" />',
].join('\n');

const coverTag =
  '<noscript><img src="{{coverUrl}}" width="{{coverWidth}}" height="{{coverHeight}}" alt="{{coverAlt}}" /></noscript>';

const template = [
  '<html lang="{{lang}}">',
  '<title>{{documentTitle}}</title>',
  '<meta property="og:title" content="{{title}}" />',
  articleTags,
  '<meta content="{{description}}" />',
  '<link rel="canonical" href="{{url}}" />',
  '{{alternateLinks}}',
  '{{feedLink}}',
  '<meta content="{{image}}" type="{{imageType}}" />',
  '<meta property="og:image:alt" content="{{imageAlt}}" />',
  '{{localeTags}}',
  '<a href="{{sourceUrl}}">{{siteName}}</a>',
  '<a class="catalogue" href="{{catalogueUrl}}">{{siteName}}</a>',
  '<script type="application/ld+json">{{structuredData}}</script>',
  coverTag,
  '<main>',
  '  {{chapters}}',
  '</main>',
  '<ul>{{moreExplainers}}</ul>',
  '<!-- partial:header-actions -->',
  '<!-- partial:footer -->',
  '<script type="module" src="{{entry}}"></script>',
  '</html>',
].join('\n');

const partials = {
  'header-actions': '<select data-language-select>{{languageOptions}}</select>',
  footer:
    '<footer>{{licenseUrl}}<a class="feed" href="{{feedUrl}}">Feed</a><ul>{{languageLinks}}</ul></footer>',
};

const english: Record<string, string> = {
  'page.metaTitle': '{{title}} · What makes it tick',
  'catalogue.metaTitle': 'What makes it tick: how things work',
};

const translations: Record<string, string> = {
  'sections.intro': 'Вступ',
  'page.metaTitle': '{{title}} · Що змушує цокати',
  'stage.coverAlt': '{{title}}: знімок моделі',
  'catalogue.title': 'Що змушує цокати',
  'catalogue.metaTitle': 'Що змушує цокати: як усе працює',
  'catalogue.tagline': 'Як працюють машини',
};

function interpolate(text: string, values: Record<string, string> = {}): string {
  return text.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}

function language(code: LanguageCode): PageLanguage {
  const table = code === 'en' ? english : translations;
  return { code, translate: (key, values) => interpolate(table[key] ?? key, values) };
}

type GraphNode = Record<string, unknown>;

function structuredData(html: string): GraphNode[] {
  const start = html.indexOf('application/ld+json">') + 'application/ld+json">'.length;
  return JSON.parse(html.slice(start, html.indexOf('</script>', start)))['@graph'];
}

function graphNode(html: string, type: string): GraphNode | undefined {
  return structuredData(html).find((node) => [node['@type']].flat().includes(type));
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': 'https://whatmakesittick.github.io/#website',
  url: 'https://whatmakesittick.github.io/',
};

function hreflangs(html: string): string[] {
  return [...html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
    ([, code, href]) => `${code} ${href}`,
  );
}

const pump: LoadedExplainer = {
  ...explainer,
  manifest: { ...explainer.manifest, slug: 'pump' },
  metas: { en: { ...meta, title: 'How a pump works' }, uk: { ...meta, title: 'Як працює насос' } },
};
const kettle: LoadedExplainer = {
  ...explainer,
  manifest: { ...explainer.manifest, slug: 'kettle', locales: ['en'] },
  metas: { en: { ...meta, title: 'How a kettle works' } },
};

describe('renderPage', () => {
  const more = catalogueCards([pump, kettle]);
  const html = renderPage(template, partials, explainer, language('en'), more);
  const ukrainian = renderPage(template, partials, explainer, language('uk'), more);

  it('escapes the explainer copy into the head', () => {
    expect(html).toContain('<title>How a &quot;thing&quot; works · What makes it tick</title>');
    expect(html).toContain('<meta property="og:title" content="How a &quot;thing&quot; works"');
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

  it('describes the social image in the language of the page', () => {
    expect(ukrainian).toContain('<meta property="og:image:alt" content="Річ у розрізі"');
  });

  it('falls back to the manifest alt text when the locale has none', () => {
    expect(html).toContain('<meta property="og:image:alt" content="A thing"');
  });

  it('shows the cover in place of the model without scripts', () => {
    expect(ukrainian).toContain(
      '<noscript><img src="/thing/cover.webp" width="932" height="699" alt="Як працює річ: знімок моделі" /></noscript>',
    );
  });

  it('links the source folder and fills the shared partials', () => {
    expect(html).toContain('/tree/main/explainers/thing">What makes it tick</a>');
    expect(html).toContain('<footer>https://github.com/whatmakesittick/');
  });

  it('links back to the catalogue in the language of the page', () => {
    expect(html).toContain('<a class="catalogue" href="/">');
    expect(ukrainian).toContain('<a class="catalogue" href="/uk/">');
  });

  it('links every language version of the page from the footer', () => {
    expect(ukrainian).toContain(
      [
        '<li><a class="footer-language" href="/thing/" hreflang="en" lang="en">English</a></li>',
        '<li><a class="footer-language" href="/uk/thing/" hreflang="uk" lang="uk" aria-current="page">Українська</a></li>',
      ].join('\n'),
    );
  });

  it('inlines the chapters at the placeholder indentation', () => {
    expect(html).toContain('<main>\n  <section class="chapter" data-preset="intro">\n    <h2');
  });

  it('dates the article for link previews', () => {
    expect(html).toContain(
      '<meta property="article:published_time" content="2026-01-10T09:00:00+02:00"',
    );
    expect(html).toContain(
      '<meta property="article:modified_time" content="2026-03-10T09:00:00+02:00"',
    );
  });

  it('describes the page as structured data with its dates', () => {
    expect(graphNode(html, 'TechArticle')).toMatchObject({
      headline: meta.title,
      inLanguage: 'en',
      datePublished: explainer.dates.published,
      dateModified: explainer.dates.modified,
    });
  });

  it('offers the social image and the cover with their sizes', () => {
    expect(graphNode(html, 'TechArticle')?.image).toEqual([
      {
        '@type': 'ImageObject',
        url: 'https://whatmakesittick.github.io/thing/social/card.png',
        width: 1200,
        height: 630,
      },
      {
        '@type': 'ImageObject',
        url: 'https://whatmakesittick.github.io/thing/cover.webp',
        width: 932,
        height: 699,
      },
    ]);
  });

  it('places the page in the site and under the catalogue of its language', () => {
    const article = graphNode(ukrainian, 'TechArticle');
    const breadcrumbs = graphNode(ukrainian, 'BreadcrumbList');
    expect(graphNode(ukrainian, 'WebSite')).toMatchObject(WEBSITE);
    expect(article).toMatchObject({
      isPartOf: { '@id': WEBSITE['@id'] },
      breadcrumb: { '@id': breadcrumbs?.['@id'] },
    });
    expect(breadcrumbs?.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Що змушує цокати',
        item: 'https://whatmakesittick.github.io/uk/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Як працює річ',
        item: 'https://whatmakesittick.github.io/uk/thing/',
      },
    ]);
  });

  it('loads the shared entry of the explainer from every language page', () => {
    expect(html).toContain('<script type="module" src="/thing/main.ts"></script>');
    expect(ukrainian).toContain('<script type="module" src="/thing/main.ts"></script>');
  });

  it('renders a language page in its language with a canonical link to itself', () => {
    expect(ukrainian).toContain('<html lang="uk">');
    expect(ukrainian).toContain('<title>Як працює річ · Що змушує цокати</title>');
    expect(ukrainian).toContain('<meta property="og:title" content="Як працює річ"');
    expect(ukrainian).toContain(
      '<link rel="canonical" href="https://whatmakesittick.github.io/uk/thing/"',
    );
    expect(ukrainian).toContain('<meta property="og:locale" content="uk_UA"');
    expect(ukrainian).toContain('<meta property="og:locale:alternate" content="en_GB"');
    expect(graphNode(ukrainian, 'TechArticle')).toMatchObject({
      headline: 'Як працює річ',
      url: 'https://whatmakesittick.github.io/uk/thing/',
      inLanguage: 'uk',
    });
  });

  it('points the head and the footer at the feed of the page language', () => {
    expect(ukrainian).toContain(
      '<link rel="alternate" type="application/rss+xml" title="Що змушує цокати" href="https://whatmakesittick.github.io/uk/feed.xml"',
    );
    expect(ukrainian).toContain('<a class="feed" href="/uk/feed.xml">');
    expect(html).toContain('href="https://whatmakesittick.github.io/feed.xml"');
    expect(html).toContain('<a class="feed" href="/feed.xml">');
  });

  it('translates the marked copy and keeps the markers for the runtime', () => {
    expect(ukrainian).toContain('<h2 data-i18n="sections.intro">Вступ</h2>');
  });

  it('links more explainers in the language of the page or in English', () => {
    const links = (page: string) =>
      [...page.matchAll(/<a class="more-explainer" href="([^"]+)">.*?title">([^<]+)</g)].map(
        ([, href, title]) => `${href} ${title}`,
      );
    expect(links(ukrainian)).toEqual(['/kettle/ How a kettle works', '/uk/pump/ Як працює насос']);
    expect(links(html)).toEqual(['/kettle/ How a kettle works', '/pump/ How a pump works']);
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
  const catalogueTemplate = template
    .replace(articleTags, '')
    .replace(coverTag, '')
    .replace('{{chapters}}', '{{catalogue}}')
    .replace('{{moreExplainers}}', '')
    .replace('{{entry}}', '/main.ts');
  const gearbox: LoadedExplainer = {
    ...explainer,
    manifest: { ...explainer.manifest, slug: 'gearbox', tags: ['mechanics'], locales: ['en'] },
    metas: { en: { ...meta, title: 'How a gearbox works' } },
    dates: { published: '2026-02-01T09:00:00+02:00', modified: '2026-02-01T09:00:00+02:00' },
  };
  const html = renderCatalogue(catalogueTemplate, partials, [explainer, gearbox], language('uk'));

  it('renders the catalogue in the language of its folder', () => {
    expect(html).toContain('<html lang="uk">');
    expect(html).toContain('<title>Що змушує цокати: як усе працює</title>');
    expect(html).toContain('<meta property="og:title" content="Що змушує цокати"');
    expect(html).toContain('content="Як працюють машини"');
    expect(html).toContain('<link rel="canonical" href="https://whatmakesittick.github.io/uk/"');
    expect(html).toContain('content="https://whatmakesittick.github.io/social/og-image.png"');
    expect(html).toContain('<a class="catalogue" href="/uk/">');
  });

  it('advertises the feed of the catalogue language', () => {
    expect(html).toContain('type="application/rss+xml" title="Що змушує цокати"');
    expect(html).toContain('href="https://whatmakesittick.github.io/uk/feed.xml"');
  });

  it('links the catalogue in every site language from the footer', () => {
    const links = [...html.matchAll(/class="footer-language" href="([^"]+)"/g)].map(
      ([, href]) => href,
    );
    expect(links).toEqual(['/', '/zh/', '/es/', '/uk/', '/pt/', '/fr/', '/de/', '/ja/']);
    expect(html).toContain('href="/uk/" hreflang="uk" lang="uk" aria-current="page"');
  });

  it('prerenders every language in the dropdown with the page language selected', () => {
    expect(html).toContain('<option value="en" lang="en">English</option>');
    expect(html).toContain('<option value="uk" lang="uk" selected>Українська</option>');
  });

  it('prerenders the cards newest first, each linked in the language of the folder', () => {
    const links = [...html.matchAll(/<a class="card" href="([^"]+)"/g)].map(([, href]) => href);
    expect(links).toEqual(['/gearbox/', '/uk/thing/']);
    expect(html).toContain('<h2 class="card-title">Як працює річ</h2>');
    expect(html).toContain('<ul class="cards" data-language="uk">');
  });

  it('lists the catalogue in every language', () => {
    expect(hreflangs(html)).toHaveLength(9);
    expect(hreflangs(html)).toContain('x-default https://whatmakesittick.github.io/');
    expect(hreflangs(html)).toContain('ja https://whatmakesittick.github.io/ja/');
  });

  it('describes the catalogue as a collection page of the site', () => {
    const list = graphNode(html, 'ItemList');
    expect(graphNode(html, 'WebSite')).toMatchObject(WEBSITE);
    expect(graphNode(html, 'CollectionPage')).toMatchObject({
      name: 'Що змушує цокати',
      description: 'Як працюють машини',
      url: 'https://whatmakesittick.github.io/uk/',
      inLanguage: 'uk',
      isPartOf: { '@id': WEBSITE['@id'] },
      mainEntity: { '@id': list?.['@id'] },
    });
  });

  it('lists the explainers newest first as structured data', () => {
    expect(graphNode(html, 'ItemList')).toMatchObject({
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
    });
  });
});

describe('renderNotFound', () => {
  const notFoundTemplate = [
    '<html lang="{{lang}}">',
    '<title data-i18n="page.metaTitle" data-i18n-values="title:notFound.title">{{documentTitle}}</title>',
    '<a class="site" href="{{catalogueUrl}}">{{siteName}}</a>',
    '<h1 data-i18n="notFound.title">Old</h1>',
    '<!-- partial:footer -->',
    '</html>',
  ].join('\n');
  const notFound: PageLanguage = {
    code: 'en',
    translate: (key, values) =>
      interpolate({ ...english, 'notFound.title': 'Page not found' }[key] ?? key, values),
  };
  const html = renderNotFound(notFoundTemplate, partials, notFound);

  it('names the missing page in the title and the heading', () => {
    expect(html).toContain('>Page not found · What makes it tick</title>');
    expect(html).toContain('<h1 data-i18n="notFound.title">Page not found</h1>');
  });

  it('leads back to the English catalogue and to the catalogue in every language', () => {
    expect(html).toContain('<a class="site" href="/">What makes it tick</a>');
    expect(html).toContain('<footer>https://github.com/whatmakesittick/');
    expect(html.match(/class="footer-language"/g)).toHaveLength(8);
    expect(html).not.toContain('aria-current');
  });

  it('links the English feed from the footer', () => {
    expect(html).toContain('<a class="feed" href="/feed.xml">');
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

describe('catalogueCards', () => {
  it('keeps only what a card shows, in every shipped language, and the publish date', () => {
    expect(catalogueCards([explainer])).toEqual([
      {
        manifest: { slug: 'thing', tags: ['tools'], cover: 'cover.webp', locales: ['en', 'uk'] },
        meta: {
          en: { title: meta.title, eyebrow: meta.eyebrow, summary: meta.summary },
          uk: { title: 'Як працює річ', eyebrow: meta.eyebrow, summary: meta.summary },
        },
        published: explainer.dates.published,
      },
    ]);
  });

  it('lists the newest explainer first', () => {
    const older = {
      ...explainer,
      manifest: { ...explainer.manifest, slug: 'older' },
      dates: { published: '2025-12-01T09:00:00+02:00', modified: '2025-12-01T09:00:00+02:00' },
    };
    const slugs = catalogueCards([older, explainer]).map((card) => card.manifest.slug);
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

describe('redirectValues', () => {
  const route = { page: 'thing', languages: ['en', 'uk'] as const };

  it('gives the English page the language redirect with the languages it ships', () => {
    expect(redirectValues('en', route).languageRedirect).toBe(
      `<script data-languages="en uk">${REDIRECT_SCRIPT}</script>`,
    );
  });

  it('leaves a language page without a redirect', () => {
    expect(redirectValues('uk', route).languageRedirect).toBe('');
  });
});
