import { describe, expect, it } from 'vitest';
import { JS_BUDGET_GZIP, checkSite, loadedScripts } from './siteCheck.ts';
import type { BuiltSite } from './siteCheck.ts';
import { parse } from 'node-html-parser';

const SITE = 'https://whatmakesittick.github.io';
const EXPLAINERS = ['engine', 'glider'];
const ABOUT = 'about';
const LANGUAGES = ['en', 'uk'] as const;
const COUNTER =
  '<script data-goatcounter="https://whatmakesittick.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';

interface PageOptions {
  description?: string;
  alternates?: string[];
  stylesheet?: string;
  cards?: number;
  preload?: boolean;
  feed?: boolean;
  counter?: boolean;
}

function pagePath(code: string, slug: string): string {
  return `${code === 'en' ? '' : `/${code}`}/${slug}${slug ? '/' : ''}`;
}

function pageHtml(code: string, slug: string, options: PageOptions = {}): string {
  const path = pagePath(code, slug);
  const alternates = options.alternates ?? [...LANGUAGES, 'x-default'];
  const links = alternates.map(
    (alt) =>
      `<link rel="alternate" hreflang="${alt}" href="${SITE}${pagePath(alt === 'x-default' ? 'en' : alt, slug)}">`,
  );
  const cards = Array.from(
    { length: options.cards ?? EXPLAINERS.length },
    (_, index) => `<a class="card" href="/${EXPLAINERS[index] ?? 'extra'}/">Card</a>`,
  );
  const body =
    slug === ABOUT
      ? '<main>About</main>'
      : slug
        ? `<div id="scene"><noscript><img class="stage-cover" src="/${slug}/cover.webp"></noscript></div>
       <a class="more-explainer" href="/other/">More</a>`
        : cards.join('');
  const preload =
    code !== 'en' && options.preload !== false
      ? '<link rel="modulepreload" href="/assets/uk.js">'
      : '';
  const feed =
    options.feed === false
      ? ''
      : `<link rel="alternate" type="application/rss+xml" href="${SITE}${pagePath(code, '')}feed.xml">`;
  const counter = options.counter === false ? '' : COUNTER;
  return `<!doctype html><html lang="${code}"><head>
    <title>How it works · What makes it tick</title>
    <meta name="description" content="${options.description ?? 'A short look inside.'}">
    <link rel="canonical" href="${SITE}${path}">
    ${links.join('')}
    ${feed}
    ${counter}
    ${options.stylesheet ? `<link rel="stylesheet" href="${options.stylesheet}">` : ''}
    <script type="application/ld+json">{"@type":"WebPage"}</script>
    ${preload}
    <script type="module" src="/assets/${slug && slug !== ABOUT ? 'engine' : 'main'}.js"></script>
  </head><body><h1>Title</h1><select data-language-select><option value="${code}">${code}</option></select>${body}</body></html>`;
}

function feedXml(code: string, slugs: readonly string[]): string {
  return slugs
    .map((slug) => `<item><guid isPermaLink="true">${SITE}${pagePath(code, slug)}</guid></item>`)
    .join('');
}

function site(overrides: Partial<Record<string, PageOptions>> = {}): BuiltSite {
  const pages = LANGUAGES.flatMap((code) =>
    ['', ABOUT, ...EXPLAINERS].map((slug) => {
      const path = pagePath(code, slug);
      return { path, html: pageHtml(code, slug, overrides[path]) };
    }),
  );
  return {
    pages,
    scripts: new Map([
      ['/assets/main.js', 'import"./shared.js";'],
      ['/assets/engine.js', 'import"./shared.js";import{a}from"./three-x.js";'],
      ['/assets/shared.js', ''],
      ['/assets/three-x.js', ''],
      ['/assets/uk.js', ''],
    ]),
    gzipBytes: new Map([
      ['/assets/main.js', 8_000],
      ['/assets/engine.js', 40_000],
      ['/assets/shared.js', 25_000],
      ['/assets/three-x.js', 160_000],
      ['/assets/uk.js', 1_000],
    ]),
    feeds: new Map(LANGUAGES.map((code) => [code, feedXml(code, EXPLAINERS)])),
    sitemap: pages.map((page) => `<loc>${SITE}${page.path}</loc>`).join('\n'),
    robots: 'Sitemap: x',
    notFound: '<meta name="robots" content="noindex">',
    favicon: new Uint8Array([0, 0, 1, 0, 2, 0]),
  };
}

describe('checkSite', () => {
  it('accepts a site that follows every rule', () => {
    expect(checkSite(site())).toEqual([]);
  });

  it('rejects a description over the snippet limit', () => {
    const problems = checkSite(site({ '/engine/': { description: 'x'.repeat(156) } }));
    expect(problems).toEqual(['/engine/: description has 156 characters, limit 155']);
  });

  it('rejects hreflang links without x-default and external stylesheets', () => {
    const problems = checkSite(
      site({
        '/': { alternates: [...LANGUAGES], stylesheet: 'https://fonts.googleapis.com/css2' },
      }),
    );
    expect(problems).toEqual([
      '/: hreflang links lack x-default',
      '/: references fonts.googleapis.com',
      '/: loads an external stylesheet https://fonts.googleapis.com/css2',
    ]);
  });

  it('rejects a site page that loads three.js or a catalogue that misses a card', () => {
    const heavy = site({ '/': { cards: 1 } });
    const scripts = new Map(heavy.scripts);
    scripts.set('/assets/main.js', 'import"./three-x.js";');
    const problems = checkSite({ ...heavy, scripts });
    expect(problems).toEqual([
      `/: loads ${168_000} gzipped bytes of JavaScript, budget ${JS_BUDGET_GZIP.site}`,
      '/: loads the three.js chunk',
      '/: links 1 explainer cards instead of 2',
      `/about/: loads ${168_000} gzipped bytes of JavaScript, budget ${JS_BUDGET_GZIP.site}`,
      '/about/: loads the three.js chunk',
      `/uk/: loads ${169_000} gzipped bytes of JavaScript, budget ${JS_BUDGET_GZIP.site}`,
      '/uk/: loads the three.js chunk',
      `/uk/about/: loads ${169_000} gzipped bytes of JavaScript, budget ${JS_BUDGET_GZIP.site}`,
      '/uk/about/: loads the three.js chunk',
    ]);
  });

  it('rejects a translated page that preloads no language chunk', () => {
    expect(checkSite(site({ '/uk/engine/': { preload: false } }))).toEqual([
      '/uk/engine/: preloads no language chunk',
    ]);
  });

  it('rejects a page without the visit counter', () => {
    expect(checkSite(site({ '/about/': { counter: false } }))).toEqual([
      '/about/: 0 visit counter scripts instead of 1',
    ]);
  });

  it('rejects a page without its feed link and a feed that misses an explainer', () => {
    const broken = site({ '/uk/glider/': { feed: false } });
    const feeds = new Map(broken.feeds);
    feeds.set('uk', feedXml('uk', ['engine']));
    feeds.delete('en');
    expect(checkSite({ ...broken, feeds })).toEqual([
      '/uk/glider/: feed link is not https://whatmakesittick.github.io/uk/feed.xml',
      'the en feed is missing',
      'the uk feed does not list exactly the built explainers',
    ]);
  });

  it('rejects a broken sitemap, a crawlable 404 and a fake favicon', () => {
    const broken = site();
    const problems = checkSite({
      ...broken,
      sitemap: '<loc>https://whatmakesittick.github.io/</loc>',
      notFound: '<script src="x"></script>',
      favicon: new Uint8Array([1, 2, 3, 4]),
    });
    expect(problems).toEqual([
      'sitemap.xml does not list exactly the built pages',
      '404.html is not noindex',
      '404.html loads scripts',
      'favicon.ico is not an ico file',
    ]);
  });
});

describe('loadedScripts', () => {
  it('follows static imports from the module scripts and preloads', () => {
    const root = parse(pageHtml('uk', 'engine'));
    expect(loadedScripts(root, site().scripts)).toEqual([
      '/assets/engine.js',
      '/assets/uk.js',
      '/assets/shared.js',
      '/assets/three-x.js',
    ]);
  });
});
