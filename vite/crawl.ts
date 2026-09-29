import type { LoadedExplainer } from './manifest.ts';
import { alternates, siteRoutes } from './routes.ts';
import type { PageRoute } from './routes.ts';
import { pageUrl, siteUrl } from './site.ts';
import type { SiteFile } from './siteFiles.ts';
import { xmlBlock, xmlDocument, xmlElement, xmlEmptyElement } from './xml.ts';

export const SITEMAP_FILE = 'sitemap.xml';
export const ROBOTS_FILE = 'robots.txt';

const XML_TYPE = 'application/xml; charset=utf-8';
const TEXT_TYPE = 'text/plain; charset=utf-8';
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

function alternateLinks(route: PageRoute): string[] {
  return alternates(route).map(({ hreflang, url }) =>
    xmlEmptyElement('xhtml:link', { rel: 'alternate', hreflang, href: url }),
  );
}

function lastModified(route: PageRoute): string[] {
  return route.modified ? [xmlElement('lastmod', route.modified)] : [];
}

function urlEntries(route: PageRoute): string[] {
  const details = [...lastModified(route), ...alternateLinks(route)];
  return route.languages.map((code) =>
    xmlBlock('url', [xmlElement('loc', pageUrl(code, route.page)), ...details]),
  );
}

export function renderSitemap(routes: readonly PageRoute[]): string {
  return xmlDocument(
    xmlBlock('urlset', routes.flatMap(urlEntries), {
      xmlns: SITEMAP_NAMESPACE,
      'xmlns:xhtml': XHTML_NAMESPACE,
    }),
  );
}

export function renderRobots(): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl(SITEMAP_FILE)}`, ''].join('\n');
}

export function crawlFiles(explainers: readonly LoadedExplainer[]): SiteFile[] {
  return [
    {
      fileName: SITEMAP_FILE,
      contentType: XML_TYPE,
      source: renderSitemap(siteRoutes(explainers)),
    },
    { fileName: ROBOTS_FILE, contentType: TEXT_TYPE, source: renderRobots() },
  ];
}
