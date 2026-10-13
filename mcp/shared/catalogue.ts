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
import type { Tag } from '../../src/core/manifest.ts';

export type { Tag };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
