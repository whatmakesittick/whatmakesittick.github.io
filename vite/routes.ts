import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { languagePath } from '../src/core/i18n/paths.ts';
import type { LoadedExplainer } from './manifest.ts';
import { pageUrl } from './site.ts';

export interface PageRoute {
  page: string;
  languages: readonly LanguageCode[];
  modified?: string;
}

export interface Alternate {
  hreflang: string;
  url: string;
}

const TRAILING_SLASH = /\/$/;
const DEFAULT_HREFLANG = 'x-default';

export const CATALOGUE_ROUTE: PageRoute = {
  page: '',
  languages: LANGUAGES.map((language) => language.code),
};

export function explainerRoute(explainer: LoadedExplainer): PageRoute {
  const { manifest, dates } = explainer;
  return { page: manifest.slug, languages: manifest.locales, modified: dates.modified };
}

export function siteRoutes(explainers: readonly LoadedExplainer[]): PageRoute[] {
  return [CATALOGUE_ROUTE, ...explainers.map(explainerRoute)];
}

export function pageFolder(code: LanguageCode, page: string): string {
  return languagePath(code, page).replace(TRAILING_SLASH, '');
}

export function alternates(route: PageRoute): Alternate[] {
  return [
    ...route.languages.map((code) => ({ hreflang: code, url: pageUrl(code, route.page) })),
    { hreflang: DEFAULT_HREFLANG, url: pageUrl(DEFAULT_LANGUAGE, route.page) },
  ];
}
