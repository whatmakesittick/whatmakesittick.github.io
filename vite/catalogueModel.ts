import { DEFAULT_LANGUAGE, type LanguageCode } from '../src/core/i18n/languages.ts';
import type { Tag } from '../src/core/manifest.ts';

export interface CatalogueParagraph {
  key: string;
  html: string;
}

export interface CatalogueInteractive {
  range: boolean;
  canvas: boolean;
  action: boolean;
  readouts: boolean;
}

export interface CatalogueChapter {
  id: string;
  index: number;
  title: string;
  paragraphs: CatalogueParagraph[];
  interactive: CatalogueInteractive;
}

export interface CatalogueLocalizedChapter {
  id: string;
  title?: string;
  paragraphs: CatalogueParagraph[];
}

export interface CatalogueLocalized {
  title?: string;
  eyebrow?: string;
  tagline?: string;
  description?: string;
  summary?: string;
  parts?: string[];
  chapters?: CatalogueLocalizedChapter[];
}

export interface LocalizedCatalogueEntry {
  slug: string;
  title: string;
  eyebrow: string;
  tagline: string;
  description: string;
  summary: string;
  tags: Tag[];
  topic: string;
  url: string;
  cover: string;
  parts: string[];
  chapters: CatalogueChapter[];
}

export interface CatalogueEntry extends LocalizedCatalogueEntry {
  locales?: Partial<Record<LanguageCode, CatalogueLocalized>>;
}

export interface Catalogue {
  generatedAt: string;
  explainers: CatalogueEntry[];
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function plainText(html: string): string {
  return html
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/&(?:#(\d+)|#x([\da-fA-F]+)|([a-zA-Z]+));/g, (entity, dec, hex, name) => {
      if (dec) return String.fromCodePoint(Number(dec));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return ENTITIES[name as string] ?? entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function localizeChapter(
  chapter: CatalogueChapter,
  localized: CatalogueLocalizedChapter | undefined,
): CatalogueChapter {
  if (!localized) return chapter;
  const byKey = new Map(localized.paragraphs.map((p) => [p.key, p]));
  return {
    ...chapter,
    title: localized.title || chapter.title,
    paragraphs: chapter.paragraphs.map((p) => byKey.get(p.key) ?? p),
  };
}

export function localizeEntry(entry: CatalogueEntry, lang: LanguageCode): LocalizedCatalogueEntry {
  const { locales, ...english } = entry;
  const text = lang === DEFAULT_LANGUAGE ? undefined : locales?.[lang];
  if (!text) return english;
  const chapters = new Map((text.chapters ?? []).map((c) => [c.id, c]));
  return {
    ...english,
    title: text.title || english.title,
    eyebrow: text.eyebrow || english.eyebrow,
    tagline: text.tagline || english.tagline,
    description: text.description || english.description,
    summary: text.summary || english.summary,
    parts: text.parts?.length ? text.parts : english.parts,
    chapters: english.chapters.map((c) => localizeChapter(c, chapters.get(c.id))),
  };
}
