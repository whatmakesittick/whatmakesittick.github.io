import type { LanguageCode } from '../core/i18n/languages.ts';
import type { ExplainerManifest, ExplainerMeta } from '../core/manifest.ts';

export type CardMeta = Pick<ExplainerMeta, 'title' | 'eyebrow' | 'summary'>;

export interface CatalogueCard {
  manifest: Pick<ExplainerManifest, 'slug' | 'tags' | 'cover' | 'locales'>;
  meta: Partial<Record<LanguageCode, CardMeta>>;
  published: string;
}

export function localizedMeta(
  card: CatalogueCard,
  language: LanguageCode,
  fallback: LanguageCode,
): CardMeta | undefined {
  return card.meta[language] ?? card.meta[fallback];
}

export function pageLanguage(
  card: CatalogueCard,
  language: LanguageCode,
  fallback: LanguageCode,
): LanguageCode {
  return card.manifest.locales.includes(language) ? language : fallback;
}
