import { DEFAULT_LANGUAGE, isLanguageCode } from './languages.ts';
import type { LanguageCode } from './languages.ts';

export interface LanguagePath {
  code: LanguageCode | undefined;
  page: string;
}

export const LANGUAGE_QUERY_KEY = 'lang';

const SEGMENT_SEPARATOR = '/';

export function languagePath(code: LanguageCode, page = ''): string {
  return [code === DEFAULT_LANGUAGE ? '' : code, page]
    .filter(Boolean)
    .map((segment) => `${segment}${SEGMENT_SEPARATOR}`)
    .join('');
}

export function splitLanguagePath(path: string): LanguagePath {
  const segments = path.split(SEGMENT_SEPARATOR).filter(Boolean);
  const [first = '', ...rest] = segments;
  return isLanguageCode(first)
    ? { code: first, page: rest.join(SEGMENT_SEPARATOR) }
    : { code: undefined, page: segments.join(SEGMENT_SEPARATOR) };
}

export function pathFromBase(pathname: string, base: string): string {
  return pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
}

export function languageUrl(href: string, base: string, code: LanguageCode): string {
  const url = new URL(href);
  const { page } = splitLanguagePath(pathFromBase(url.pathname, base));
  url.pathname = `${base}${languagePath(code, page)}`;
  url.searchParams.delete(LANGUAGE_QUERY_KEY);
  return url.href;
}
