import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { Tag } from '../src/core/manifest.ts';
import { localizeEntry } from './catalogueModel.ts';
import type { CatalogueEntry } from './catalogueModel.ts';
import { EMBED_DIRECTORY } from './embedPaths.ts';

export const EMBED_CATALOGUE_DIRECTORY = 'catalogue';
const MODULE_PREFIX = 'export default ';
const MODULE_SUFFIX = ';\n';

export interface EmbedCatalogueEntry {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  tags: Tag[];
  cover: string;
  chapters: { id: string; title: string }[];
}

export interface EmbedCatalogue {
  explainers: EmbedCatalogueEntry[];
  taglines: Record<string, string>;
}

export function embedCatalogueFile(lang: LanguageCode): string {
  return `${EMBED_CATALOGUE_DIRECTORY}/${lang}.js`;
}

export function embedCatalogue(
  entries: readonly CatalogueEntry[],
  lang: LanguageCode = DEFAULT_LANGUAGE,
): EmbedCatalogue {
  const localized = entries.map((entry) => localizeEntry(entry, lang));
  return {
    explainers: localized.map(({ slug, title, eyebrow, summary, tags, cover, chapters }) => ({
      slug,
      title,
      eyebrow,
      summary,
      tags,
      cover,
      chapters: chapters.map(({ id, title: chapterTitle }) => ({ id, title: chapterTitle })),
    })),
    taglines: Object.fromEntries(localized.map(({ slug, tagline }) => [slug, tagline])),
  };
}

export function renderEmbedCatalogue(catalogue: EmbedCatalogue): string {
  return `${MODULE_PREFIX}${JSON.stringify(catalogue)}${MODULE_SUFFIX}`;
}

export function parseEmbedCatalogue(source: string): EmbedCatalogue | undefined {
  if (!source.startsWith(MODULE_PREFIX) || !source.endsWith(MODULE_SUFFIX)) return undefined;
  try {
    const value = JSON.parse(
      source.slice(MODULE_PREFIX.length, -MODULE_SUFFIX.length),
    ) as Partial<EmbedCatalogue>;
    return Array.isArray(value.explainers) && typeof value.taglines === 'object'
      ? (value as EmbedCatalogue)
      : undefined;
  } catch {
    return undefined;
  }
}

export function embedCatalogueFiles(
  entries: readonly CatalogueEntry[],
): { fileName: string; source: string }[] {
  return LANGUAGE_CODES.map((lang) => ({
    fileName: `${EMBED_DIRECTORY}/${embedCatalogueFile(lang)}`,
    source: renderEmbedCatalogue(embedCatalogue(entries, lang)),
  }));
}
