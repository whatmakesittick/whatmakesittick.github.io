import { DEFAULT_LANGUAGE } from './languages';
import type { LanguageCode } from './languages';
import { LANGUAGE_QUERY_KEY, splitLanguagePath } from './paths';

export interface PreferredLanguages {
  stored: LanguageCode | undefined;
  browser: LanguageCode | undefined;
}

export interface Visit extends PreferredLanguages {
  path: string;
  search: string;
  pageLanguages: readonly LanguageCode[];
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
