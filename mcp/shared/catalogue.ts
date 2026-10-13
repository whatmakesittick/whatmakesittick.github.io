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
export { embedCatalogueFile } from '../../vite/embedCatalogue.ts';
export { parseSlugAliases, resolveSlug, type SlugAliases } from '../../vite/slugAliases.ts';
export type {
  EmbedCatalogue as WidgetCatalogue,
  EmbedCatalogueEntry as WidgetCatalogueEntry,
} from '../../vite/embedCatalogue.ts';
export { resolveLanguage } from '../../src/core/i18n/languages.ts';
import { TAGS } from '../../src/core/manifest.ts';
import type { Tag } from '../../src/core/manifest.ts';

export { TAGS };
export type { Tag };

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
