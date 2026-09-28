import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { languagePath } from '../src/core/i18n/paths.ts';
import { compareNewestFirst } from '../src/core/manifest.ts';
import type { CatalogueEntry, ExplainerMeta } from '../src/core/manifest.ts';
import { alternateLinks, imageType, jsonLd, localeTags } from './head.ts';
import type { PageLanguage } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';
import { CATALOGUE_ROUTE, explainerRoute } from './routes.ts';
import type { PageRoute } from './routes.ts';
import {
  COVER_SIZE,
  LICENSE_URL,
  REPOSITORY_URL,
  SITE_NAME,
  SITE_SOCIAL,
  SOCIAL_IMAGE_SIZE,
  explainerSourceUrl,
  explainerUrl,
  pageUrl,
  siteUrl,
} from './site.ts';
import { catalogueData, explainerData } from './structuredData.ts';
import type { ExplainerFacts, ListedPage } from './structuredData.ts';
import { escapeHtml, expandPartials, fillTemplate } from './template.ts';
import type { TemplateValues } from './template.ts';
import { translateHtml } from './translateHtml.ts';

export const CORE_ALIAS = '@core';
export const MOUNT_MODULE = `${CORE_ALIAS}/mount`;
export const PAGE_ENTRY = 'main.ts';

const ROOT_PATH = '/';
const CATALOGUE_TAGLINE_KEY = 'catalogue.tagline';
const CATALOGUE_TITLE_KEY = 'catalogue.title';
const CATALOGUE_DOCUMENT_TITLE_KEY = 'catalogue.metaTitle';
const PAGE_DOCUMENT_TITLE_KEY = 'page.metaTitle';
const COVER_ALT_KEY = 'stage.coverAlt';

export function siteValues(sourceUrl: string): TemplateValues {
  return {
    siteName: escapeHtml(SITE_NAME),
    repositoryUrl: escapeHtml(REPOSITORY_URL),
    licenseUrl: escapeHtml(LICENSE_URL),
    sourceUrl: escapeHtml(sourceUrl),
  };
}

function languageValues(code: LanguageCode, route: PageRoute): TemplateValues {
  return {
    lang: code,
    url: escapeHtml(pageUrl(code, route.page)),
    catalogueUrl: escapeHtml(`${ROOT_PATH}${languagePath(code, CATALOGUE_ROUTE.page)}`),
    localeTags: localeTags(code, route),
    alternateLinks: alternateLinks(route),
  };
}

function socialValues(image: string, alt: string): TemplateValues {
  return {
    image: escapeHtml(image),
    imageType: imageType(image),
    imageWidth: String(SOCIAL_IMAGE_SIZE.width),
    imageHeight: String(SOCIAL_IMAGE_SIZE.height),
    imageAlt: escapeHtml(alt),
  };
}

function explainerHeadValues(
  { dates }: LoadedExplainer,
  meta: ExplainerMeta,
  { translate }: PageLanguage,
): TemplateValues {
  return {
    documentTitle: escapeHtml(translate(PAGE_DOCUMENT_TITLE_KEY, { title: meta.title })),
    published: escapeHtml(dates.published),
    modified: escapeHtml(dates.modified),
  };
}

function coverValues(
  { manifest }: LoadedExplainer,
  meta: ExplainerMeta,
  { translate }: PageLanguage,
): TemplateValues {
  return {
    coverUrl: escapeHtml(`/${manifest.slug}/${manifest.cover}`),
    coverWidth: String(COVER_SIZE.width),
    coverHeight: String(COVER_SIZE.height),
    coverAlt: escapeHtml(translate(COVER_ALT_KEY, { title: meta.title })),
  };
}

function explainerFacts(
  { manifest }: LoadedExplainer,
  { code, translate }: PageLanguage,
  image: string,
): ExplainerFacts {
  return {
    code,
    url: pageUrl(code, manifest.slug),
    image,
    cover: `${explainerUrl(manifest.slug)}${manifest.cover}`,
    catalogue: { name: translate(CATALOGUE_TITLE_KEY), url: pageUrl(code, CATALOGUE_ROUTE.page) },
  };
}

function catalogueHeadValues({ translate }: PageLanguage): TemplateValues {
  return {
    documentTitle: escapeHtml(translate(CATALOGUE_DOCUMENT_TITLE_KEY)),
  };
}

function render(template: string, partials: TemplateValues, values: TemplateValues): string {
  return fillTemplate(expandPartials(template, partials), values);
}

export function renderPage(
  template: string,
  partials: TemplateValues,
  explainer: LoadedExplainer,
  language: PageLanguage,
): string {
  const { code, translate } = language;
  const { manifest } = explainer;
  const meta = explainer.metas[code] ?? explainer.meta;
  const route = explainerRoute(explainer);
  const image = `${explainerUrl(manifest.slug)}${manifest.social.image}`;
  const facts = explainerFacts(explainer, language, image);
  const html = render(template, partials, {
    ...siteValues(explainerSourceUrl(manifest.slug)),
    ...languageValues(code, route),
    ...socialValues(image, meta.socialAlt ?? manifest.social.alt),
    ...explainerHeadValues(explainer, meta, language),
    ...coverValues(explainer, meta, language),
    title: escapeHtml(meta.title),
    description: escapeHtml(meta.description),
    eyebrow: escapeHtml(meta.eyebrow),
    tagline: escapeHtml(meta.tagline),
    structuredData: jsonLd(explainerData(meta, facts, explainer.dates)),
    chapters: explainer.chapters,
    entry: `/${manifest.slug}/${PAGE_ENTRY}`,
  });
  return translateHtml(html, translate);
}

function catalogueEntry({ manifest, metas, dates }: LoadedExplainer): CatalogueEntry {
  return { manifest, meta: metas, published: dates.published };
}

function catalogueOrder(explainers: readonly LoadedExplainer[]): LoadedExplainer[] {
  return [...explainers].sort((a, b) => compareNewestFirst(catalogueEntry(a), catalogueEntry(b)));
}

function listedPage(explainer: LoadedExplainer, code: LanguageCode): ListedPage {
  const { manifest, metas, meta } = explainer;
  const language = manifest.locales.includes(code) ? code : DEFAULT_LANGUAGE;
  return { name: (metas[language] ?? meta).title, url: pageUrl(language, manifest.slug) };
}

export function renderCatalogue(
  template: string,
  partials: TemplateValues,
  explainers: readonly LoadedExplainer[],
  language: PageLanguage,
): string {
  const { code, translate } = language;
  const pages = catalogueOrder(explainers).map((explainer) => listedPage(explainer, code));
  const image = siteUrl(SITE_SOCIAL.image);
  const title = translate(CATALOGUE_TITLE_KEY);
  const description = translate(CATALOGUE_TAGLINE_KEY);
  const facts = { code, url: pageUrl(code, CATALOGUE_ROUTE.page), image };
  const html = render(template, partials, {
    ...siteValues(REPOSITORY_URL),
    ...languageValues(code, CATALOGUE_ROUTE),
    ...socialValues(image, SITE_SOCIAL.alt),
    ...catalogueHeadValues(language),
    title: escapeHtml(title),
    description: escapeHtml(description),
    structuredData: jsonLd(catalogueData({ name: title, description }, facts, pages)),
  });
  return translateHtml(html, translate);
}

function localeLoader(localesRoot: string, code: LanguageCode): string {
  return code === DEFAULT_LANGUAGE
    ? `  ${code}: () => Promise.resolve(${code}),`
    : `  ${code}: () => import('${localesRoot}/${code}.json').then((module) => module.default),`;
}

export function renderEntry(manifest: LoadedExplainer['manifest']): string {
  const explainerRoot = `../explainers/${manifest.slug}`;
  const localesRoot = `${explainerRoot}/locales`;
  return [
    `import { mountExplainer } from '${MOUNT_MODULE}';`,
    `import explainer from '${explainerRoot}/${manifest.entry}';`,
    `import ${DEFAULT_LANGUAGE} from '${localesRoot}/${DEFAULT_LANGUAGE}.json';`,
    '',
    'await mountExplainer(explainer, {',
    ...manifest.locales.map((code) => localeLoader(localesRoot, code)),
    '});',
    '',
  ].join('\n');
}

export function catalogueEntries(explainers: readonly LoadedExplainer[]): CatalogueEntry[] {
  return catalogueOrder(explainers).map(catalogueEntry);
}

export function renderCatalogueModule(explainers: readonly LoadedExplainer[]): string {
  return `export const entries = ${JSON.stringify(catalogueEntries(explainers))};\n`;
}
