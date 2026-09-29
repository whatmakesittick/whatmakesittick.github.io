import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { pageLanguage } from './i18n.ts';
import type { Dictionaries, PageLanguage } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';
import { catalogueOrder } from './page.ts';
import { CATALOGUE_ROUTE } from './routes.ts';
import { FEED_TYPE, feedPath, feedUrl, pageUrl } from './site.ts';
import type { SiteFile } from './siteFiles.ts';
import { xmlBlock, xmlDocument, xmlElement, xmlEmptyElement } from './xml.ts';

const FEED_CONTENT_TYPE = `${FEED_TYPE}; charset=utf-8`;
const RSS_VERSION = '2.0';
const ATOM_NAMESPACE = 'http://www.w3.org/2005/Atom';
const TITLE_KEY = 'catalogue.metaTitle';
const DESCRIPTION_KEY = 'catalogue.tagline';

function rfc822(date: string): string {
  return new Date(date).toUTCString();
}

function renderItem(explainer: LoadedExplainer, code: LanguageCode): string {
  const { manifest, metas, meta, dates } = explainer;
  const { title, summary } = metas[code] ?? meta;
  const url = pageUrl(code, manifest.slug);
  return xmlBlock('item', [
    xmlElement('title', title),
    xmlElement('link', url),
    xmlElement('guid', url, { isPermaLink: 'true' }),
    xmlElement('pubDate', rfc822(dates.published)),
    xmlElement('description', summary),
    ...manifest.tags.map((tag) => xmlElement('category', tag)),
  ]);
}

export function renderFeed(
  explainers: readonly LoadedExplainer[],
  { code, translate }: PageLanguage,
): string {
  const entries = catalogueOrder(explainers).filter(({ manifest }) =>
    manifest.locales.includes(code),
  );
  const newest = entries.at(0)?.dates.published;
  const channel = xmlBlock('channel', [
    xmlElement('title', translate(TITLE_KEY)),
    xmlElement('link', pageUrl(code, CATALOGUE_ROUTE.page)),
    xmlElement('description', translate(DESCRIPTION_KEY)),
    xmlElement('language', code),
    xmlEmptyElement('atom:link', { href: feedUrl(code), rel: 'self', type: FEED_TYPE }),
    ...(newest ? [xmlElement('lastBuildDate', rfc822(newest))] : []),
    ...entries.map((entry) => renderItem(entry, code)),
  ]);
  return xmlDocument(
    xmlBlock('rss', [channel], { version: RSS_VERSION, 'xmlns:atom': ATOM_NAMESPACE }),
  );
}

export function feedFiles(explainers: readonly LoadedExplainer[], core: Dictionaries): SiteFile[] {
  return CATALOGUE_ROUTE.languages.map((code) => ({
    fileName: feedPath(code),
    contentType: FEED_CONTENT_TYPE,
    source: renderFeed(explainers, pageLanguage(core, code)),
  }));
}
