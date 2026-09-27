import { fileURLToPath } from 'node:url';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { loadExplainers } from '../vite/manifest.ts';

const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url));

export interface ExplainerUnderTest {
  slug: string;
  languages: LanguageCode[];
}

function languagesToCheck(locales: readonly LanguageCode[]): LanguageCode[] {
  return [...new Set([DEFAULT_LANGUAGE, locales.at(-1) ?? DEFAULT_LANGUAGE])];
}

export function discoverExplainers(): ExplainerUnderTest[] {
  return loadExplainers(REPOSITORY_ROOT).map(({ manifest }) => ({
    slug: manifest.slug,
    languages: languagesToCheck(manifest.locales),
  }));
}

export const CATALOGUE_LANGUAGES = languagesToCheck(LANGUAGES.map(({ code }) => code));
