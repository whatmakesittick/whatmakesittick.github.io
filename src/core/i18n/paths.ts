import { DEFAULT_LANGUAGE } from './languages.ts';
import type { LanguageCode } from './languages.ts';

export function languagePath(code: LanguageCode, page = ''): string {
  return [code === DEFAULT_LANGUAGE ? '' : code, page]
    .filter(Boolean)
    .map((segment) => `${segment}/`)
    .join('');
}
