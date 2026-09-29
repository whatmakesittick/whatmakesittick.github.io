import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { languagePath } from '../src/core/i18n/paths.ts';
import { PAGE_LANGUAGES_SEPARATOR } from '../src/core/i18n/redirect.ts';
import { compareNewestFirst } from '../src/core/manifest.ts';
import type { CatalogueEntry, ExplainerMeta } from '../src/core/manifest.ts';
import type { CardMeta, CatalogueCard } from '../src/site/catalogue.ts';
import { renderCatalogueGrid } from '../src/site/catalogueMarkup.ts';
import { alternateLinks, imageType, jsonLd, localeTags } from './head.ts';
import type { PageLanguage } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';
import { renderMoreExplainers } from './moreExplainers.ts';
import type { LoadedAbout } from './about.ts';
import { ABOUT_ENTRY } from './about.ts';
import { ABOUT_ROUTE, CATALOGUE_ROUTE, explainerRoute } from './routes.ts';
import type { PageRoute } from './routes.ts';
import { REDIRECT_SCRIPT } from './redirectScript.ts';
import {
  COVER_SIZE,
  FEED_TYPE,
  ISSUES_URL,
  LICENSE_URL,
  REPOSITORY_URL,
  SITE_NAME,
  SITE_SOCIAL,
  SOCIAL_IMAGE_SIZE,
  explainerSourceUrl,
  explainerUrl,
  feedPath,
  feedUrl,
  pageUrl,
  siteUrl,
} from './site.ts';
import { aboutData, catalogueData, explainerData } from './structuredData.ts';
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
const NOT_FOUND_TITLE_KEY = 'notFound.title';
const ABOUT_TITLE_KEY = 'about.title';
const ABOUT_DESCRIPTION_KEY = 'about.description';

export function siteValues(sourceUrl: string): TemplateValues {
  return {
    siteName: escapeHtml(SITE_NAME),
    repositoryUrl: escapeHtml(REPOSITORY_URL),
    licenseUrl: escapeHtml(LICENSE_URL),
    sourceUrl: escapeHtml(sourceUrl),
  };
}

function pagePath(code: LanguageCode, page: string): string {
  return `${ROOT_PATH}${languagePath(code, page)}`;
}

function languageLinks(route: PageRoute, current?: LanguageCode): string {
  return LANGUAGES.filter(({ code }) => route.languages.includes(code))
    .map(({ code, label }) => {
      const currentPage = code === current ? ' aria-current="page"' : '';
      const href = escapeHtml(pagePath(code, route.page));
      return `<li><a class="footer-language" href="${href}" hreflang="${code}" lang="${code}"${currentPage}>${escapeHtml(label)}</a></li>`;
    })
    .join('\n');
}

function languageOptions(current: LanguageCode): string {
  return LANGUAGES.map(({ code, label }) => {
    const selected = code === current ? ' selected' : '';
    return `<option value="${code}" lang="${code}"${selected}>${escapeHtml(label)}</option>`;
  }).join('');
}

function siteLinkValues(code: LanguageCode): TemplateValues {
  return {
    catalogueUrl: escapeHtml(pagePath(code, CATALOGUE_ROUTE.page)),
    aboutUrl: escapeHtml(pagePath(code, ABOUT_ROUTE.page)),
  };
}

function languageValues(code: LanguageCode, route: PageRoute): TemplateValues {
  return {
    lang: code,
    url: escapeHtml(pageUrl(code, route.page)),
    ...siteLinkValues(code),
    localeTags: localeTags(code, route),
    alternateLinks: alternateLinks(route),
    languageLinks: languageLinks(route, code),
    languageOptions: languageOptions(code),
  };
}

function feedValues({ code, translate }: PageLanguage): TemplateValues {
  const title = escapeHtml(translate(CATALOGUE_TITLE_KEY));
  return {
    feedUrl: escapeHtml(`${ROOT_PATH}${feedPath(code)}`),
    feedLink: `<link rel="alternate" type="${FEED_TYPE}" title="${title}" href="${escapeHtml(feedUrl(code))}" />`,
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

export function redirectValues(code: LanguageCode, route: PageRoute): TemplateValues {
  if (code !== DEFAULT_LANGUAGE) return { languageRedirect: '' };
  const languages = escapeHtml(route.languages.join(PAGE_LANGUAGES_SEPARATOR));
  return { languageRedirect: `<script data-languages="${languages}">${REDIRECT_SCRIPT}</script>` };
}

function render(template: string, partials: TemplateValues, values: TemplateValues): string {
  return fillTemplate(expandPartials(template, partials), values);
}

export function renderPage(
  template: string,
  partials: TemplateValues,
  explainer: LoadedExplainer,
  language: PageLanguage,
  moreExplainers: readonly CatalogueCard[],
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
    ...feedValues(language),
    ...redirectValues(code, route),
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
    moreExplainers: renderMoreExplainers(moreExplainers, { code, base: ROOT_PATH }),
  });
  return translateHtml(html, translate);
}

function catalogueEntry({ manifest, metas, dates }: LoadedExplainer): CatalogueEntry {
  return { manifest, meta: metas, published: dates.published };
}

export function catalogueOrder(explainers: readonly LoadedExplainer[]): LoadedExplainer[] {
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
    ...feedValues(language),
    ...redirectValues(code, CATALOGUE_ROUTE),
    ...socialValues(image, SITE_SOCIAL.alt),
    ...catalogueHeadValues(language),
    title: escapeHtml(title),
    description: escapeHtml(description),
    structuredData: jsonLd(catalogueData({ name: title, description }, facts, pages)),
    catalogue: catalogueGrid(explainers, { code, translate }),
  });
  return translateHtml(html, translate);
}

export function renderNotFound(
  template: string,
  partials: TemplateValues,
  language: PageLanguage,
): string {
  const { code, translate } = language;
  const title = translate(NOT_FOUND_TITLE_KEY);
  const html = render(template, partials, {
    ...siteValues(REPOSITORY_URL),
    ...feedValues(language),
    ...siteLinkValues(code),
    lang: code,
    languageLinks: languageLinks(CATALOGUE_ROUTE),
    documentTitle: escapeHtml(translate(PAGE_DOCUMENT_TITLE_KEY, { title })),
  });
  return translateHtml(html, translate);
}

export function renderAbout(
  about: LoadedAbout,
  partials: TemplateValues,
  language: PageLanguage,
): string {
  const { code, translate } = language;
  const image = siteUrl(SITE_SOCIAL.image);
  const title = translate(ABOUT_TITLE_KEY);
  const description = translate(ABOUT_DESCRIPTION_KEY);
  const facts = { code, url: pageUrl(code, ABOUT_ROUTE.page), image };
  const catalogue = {
    name: translate(CATALOGUE_TITLE_KEY),
    url: pageUrl(code, CATALOGUE_ROUTE.page),
  };
  const html = render(about.template, partials, {
    ...siteValues(REPOSITORY_URL),
    ...languageValues(code, ABOUT_ROUTE),
    ...feedValues(language),
    ...redirectValues(code, ABOUT_ROUTE),
    ...socialValues(image, SITE_SOCIAL.alt),
    documentTitle: escapeHtml(translate(PAGE_DOCUMENT_TITLE_KEY, { title })),
    title: escapeHtml(title),
    description: escapeHtml(description),
    structuredData: jsonLd(aboutData({ name: title, description }, facts, about.dates, catalogue)),
    issuesUrl: escapeHtml(ISSUES_URL),
    entry: `/${ABOUT_ENTRY}`,
  });
  return translateHtml(html, translate);
}

function catalogueGrid(explainers: readonly LoadedExplainer[], language: PageLanguage): string {
  return renderCatalogueGrid(catalogueCards(explainers), { ...language, base: ROOT_PATH });
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

function cardMeta({ title, eyebrow, summary }: ExplainerMeta): CardMeta {
  return { title, eyebrow, summary };
}

function catalogueCard({ manifest, metas, dates }: LoadedExplainer): CatalogueCard {
  const { slug, tags, cover, locales } = manifest;
  const meta: CatalogueCard['meta'] = {};
  for (const code of locales) {
    const localized = metas[code];
    if (localized) meta[code] = cardMeta(localized);
  }
  return { manifest: { slug, tags, cover, locales }, meta, published: dates.published };
}

export function catalogueCards(explainers: readonly LoadedExplainer[]): CatalogueCard[] {
  return catalogueOrder(explainers).map(catalogueCard);
}

export function renderCatalogueModule(explainers: readonly LoadedExplainer[]): string {
  return `export const entries = ${JSON.stringify(catalogueCards(explainers))};\n`;
}
