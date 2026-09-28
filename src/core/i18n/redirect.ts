import { DEFAULT_LANGUAGE, baseLanguage } from './languages.ts';
import type { LanguageCode } from './languages.ts';
import { LANGUAGE_QUERY_KEY, pathFromBase, splitLanguagePath } from './paths.ts';

export const LANGUAGE_STORAGE_KEY = 'language';
export const PAGE_LANGUAGES_SEPARATOR = ' ';

export interface PreferredLanguages {
  stored: LanguageCode | undefined;
  browser: LanguageCode | undefined;
}

export interface Visit extends PreferredLanguages {
  path: string;
  search: string;
  pageLanguages: readonly string[];
}

export interface RedirectEnvironment {
  location: { pathname: string; search: string; hash: string };
  navigator: { languages: readonly string[] };
  storage(): { getItem(key: string): string | null };
}

function choosesLanguageExplicitly({ path, search }: Visit): boolean {
  return (
    splitLanguagePath(path).code !== undefined ||
    new URLSearchParams(search).has(LANGUAGE_QUERY_KEY)
  );
}

export function languagePageToOpen(visit: Visit): LanguageCode | undefined {
  if (choosesLanguageExplicitly(visit)) return undefined;
  const preferred = visit.stored ?? visit.browser;
  if (!preferred || preferred === DEFAULT_LANGUAGE) return undefined;
  return visit.pageLanguages.includes(preferred) ? preferred : undefined;
}

function storedLanguage(environment: RedirectEnvironment): LanguageCode | undefined {
  try {
    return baseLanguage(environment.storage().getItem(LANGUAGE_STORAGE_KEY) ?? '');
  } catch {
    return undefined;
  }
}

export function languagePageUrl(
  environment: RedirectEnvironment,
  pageLanguages: readonly string[],
  base: string,
): string | undefined {
  const { pathname, search, hash } = environment.location;
  const path = pathFromBase(pathname, base);
  const code = languagePageToOpen({
    path,
    search,
    pageLanguages,
    stored: storedLanguage(environment),
    browser: environment.navigator.languages.map(baseLanguage).find(Boolean),
  });
  return code && `${base}${code}/${path}${search}${hash}`;
}
