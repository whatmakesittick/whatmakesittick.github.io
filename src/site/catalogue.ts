import type { LanguageCode } from '@core/i18n/languages';
import { CATEGORIES } from '@core/manifest';
import type { CatalogueEntry, Category, ExplainerMeta } from '@core/manifest';

export interface CategoryGroup {
  category: Category;
  entries: CatalogueEntry[];
}

export function groupByCategory(entries: readonly CatalogueEntry[]): CategoryGroup[] {
  return CATEGORIES.map((category) => ({
    category,
    entries: entries.filter((entry) => entry.manifest.category === category),
  })).filter((group) => group.entries.length > 0);
}

export function localizedMeta(
  entry: CatalogueEntry,
  language: LanguageCode,
  fallback: LanguageCode,
): ExplainerMeta | undefined {
  return entry.meta[language] ?? entry.meta[fallback];
}
