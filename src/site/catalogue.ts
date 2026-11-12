import type { LanguageCode } from '../core/i18n/languages.ts';
import type { ExplainerManifest, ExplainerMeta } from '../core/manifest.ts';

export type CardMeta = Pick<ExplainerMeta, 'title' | 'eyebrow' | 'summary'>;

export type CardMetaMap = Record<string, CardMeta>;
export type CardMetas = Partial<Record<LanguageCode, CardMetaMap>>;
export type CardMetaLoader = (code: LanguageCode) => Promise<CardMetaMap>;

export interface CatalogueCard {
  manifest: Pick<ExplainerManifest, 'slug' | 'tags' | 'cover' | 'locales'>;
  published: string;
}

export function localizedMeta(
  card: CatalogueCard,
  metas: CardMetas,
  language: LanguageCode,
  fallback: LanguageCode,
): CardMeta | undefined {
  const { slug } = card.manifest;
  return metas[language]?.[slug] ?? metas[fallback]?.[slug];
}

export function pageLanguage(
  card: CatalogueCard,
  language: LanguageCode,
  fallback: LanguageCode,
): LanguageCode {
  return card.manifest.locales.includes(language) ? language : fallback;
}
