import { fileURLToPath } from 'node:url';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { loadExplainers } from '../vite/manifest.ts';

const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url));

export interface ExplainerUnderTest {
  slug: string;
  secondLanguage: LanguageCode | undefined;
}

function secondLanguage(locales: readonly LanguageCode[]): LanguageCode | undefined {
  const last = locales.at(-1);
  return last === DEFAULT_LANGUAGE ? undefined : last;
}

export function discoverExplainers(): ExplainerUnderTest[] {
  return loadExplainers(REPOSITORY_ROOT).map(({ manifest }) => ({
    slug: manifest.slug,
    secondLanguage: secondLanguage(manifest.locales),
  }));
}

export const CATALOGUE_SECOND_LANGUAGE = secondLanguage(LANGUAGES.map(({ code }) => code));
