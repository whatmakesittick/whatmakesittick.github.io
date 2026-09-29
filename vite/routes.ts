import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { languagePath } from '../src/core/i18n/paths.ts';
import { ABOUT_PAGE, CATALOGUE_PAGE } from '../src/core/pages.ts';
import type { LoadedAbout } from './about.ts';
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

const SITE_LANGUAGES = LANGUAGES.map((language) => language.code);

export const CATALOGUE_ROUTE: PageRoute = { page: CATALOGUE_PAGE, languages: SITE_LANGUAGES };
export const ABOUT_ROUTE: PageRoute = { page: ABOUT_PAGE, languages: SITE_LANGUAGES };

export function explainerRoute(explainer: LoadedExplainer): PageRoute {
  const { manifest, dates } = explainer;
  return { page: manifest.slug, languages: manifest.locales, modified: dates.modified };
}

function newestModified(explainers: readonly LoadedExplainer[]): string | undefined {
  return explainers
    .map(({ dates }) => dates.modified)
    .reduce<string | undefined>(
      (newest, date) => (newest && Date.parse(newest) >= Date.parse(date) ? newest : date),
      undefined,
    );
}

export function catalogueRoute(explainers: readonly LoadedExplainer[]): PageRoute {
  const modified = newestModified(explainers);
  return modified ? { ...CATALOGUE_ROUTE, modified } : CATALOGUE_ROUTE;
}

export function aboutRoute(about: LoadedAbout): PageRoute {
  return { ...ABOUT_ROUTE, modified: about.dates.modified };
}

export function siteRoutes(
  explainers: readonly LoadedExplainer[],
  about: LoadedAbout,
): PageRoute[] {
  return [catalogueRoute(explainers), aboutRoute(about), ...explainers.map(explainerRoute)];
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
