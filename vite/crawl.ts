import type { LoadedExplainer } from './manifest.ts';
import { alternates, siteRoutes } from './routes.ts';
import type { PageRoute } from './routes.ts';
import { pageUrl, siteUrl } from './site.ts';
import { escapeHtml, indent } from './template.ts';

export const SITEMAP_FILE = 'sitemap.xml';
export const ROBOTS_FILE = 'robots.txt';

const XML_TYPE = 'application/xml; charset=utf-8';
const TEXT_TYPE = 'text/plain; charset=utf-8';
const XML_INDENT = '  ';
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export interface CrawlFile {
  fileName: string;
  contentType: string;
  source: string;
}

function alternateLinks(route: PageRoute): string[] {
  return alternates(route).map(
    ({ hreflang, url }) =>
      `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(url)}" />`,
  );
}

function urlEntries(route: PageRoute): string[] {
  const links = alternateLinks(route);
  return route.languages.map((code) =>
    [
      '<url>',
      indent(
        [`<loc>${escapeHtml(pageUrl(code, route.page))}</loc>`, ...links].join('\n'),
        XML_INDENT,
      ),
      '</url>',
    ].join('\n'),
  );
}

export function renderSitemap(routes: readonly PageRoute[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:xhtml="${XHTML_NAMESPACE}">`,
    indent(routes.flatMap(urlEntries).join('\n'), XML_INDENT),
    '</urlset>',
    '',
  ].join('\n');
}

export function renderRobots(): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl(SITEMAP_FILE)}`, ''].join('\n');
}

export function crawlFiles(explainers: readonly LoadedExplainer[]): CrawlFile[] {
  return [
    {
      fileName: SITEMAP_FILE,
      contentType: XML_TYPE,
      source: renderSitemap(siteRoutes(explainers)),
    },
    { fileName: ROBOTS_FILE, contentType: TEXT_TYPE, source: renderRobots() },
  ];
}
