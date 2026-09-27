import type { LanguageCode } from '@core/i18n/languages';
import type { CatalogueEntry, ExplainerMeta } from '@core/manifest';

export function localizedMeta(
  entry: CatalogueEntry,
  language: LanguageCode,
  fallback: LanguageCode,
): ExplainerMeta | undefined {
  return entry.meta[language] ?? entry.meta[fallback];
}

export function pageLanguage(
  entry: CatalogueEntry,
  language: LanguageCode,
  fallback: LanguageCode,
): LanguageCode {
  return entry.manifest.locales.includes(language) ? language : fallback;
}
