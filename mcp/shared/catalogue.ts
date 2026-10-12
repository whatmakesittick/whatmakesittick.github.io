export { localizeEntry, plainText } from '../../vite/catalogueModel.ts';
export type {
  Catalogue,
  CatalogueChapter,
  CatalogueEntry,
  CatalogueInteractive,
  CatalogueLocalized,
  CatalogueLocalizedChapter,
  CatalogueParagraph,
  LocalizedCatalogueEntry,
} from '../../vite/catalogueModel.ts';
export { SITE_URL, explainerUrl } from '../../vite/site.ts';
export { resolveLanguage } from '../../src/core/i18n/languages.ts';
import { TAGS } from '../../src/core/manifest.ts';
import type { Tag } from '../../src/core/manifest.ts';

export { TAGS };
export type { Tag };

export interface WidgetCatalogueEntry {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  tags: Tag[];
  cover: string;
  chapters: { id: string; title: string }[];
}

export interface WidgetCatalogue {
  explainers: WidgetCatalogueEntry[];
}

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export type BakedCatalogue = WidgetCatalogue & { taglines: Record<string, string> };
