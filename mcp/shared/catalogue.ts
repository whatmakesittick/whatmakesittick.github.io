import {
  DEFAULT_LANGUAGE,
  baseLanguage,
  isLanguageCode,
  type LanguageCode,
} from '../../src/core/i18n/languages.ts';
import { TAGS } from '../../src/core/manifest.ts';
import type { Tag } from '../../src/core/manifest.ts';

export { TAGS };
export type { Tag };

export interface CatalogueParagraph {
  key: string;
  html: string;
  text: string;
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

export const SITE_ORIGIN = 'https://whatmakesittick.github.io';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function explainerUrl(slug: string): string {
  return `${SITE_ORIGIN}/${slug}/`;
}

export type BakedCatalogue = WidgetCatalogue & { taglines: Record<string, string> };

export function resolveLanguage(raw: string | undefined): LanguageCode {
  const code = (raw ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (isLanguageCode(code)) return code;
  return baseLanguage(code) ?? DEFAULT_LANGUAGE;
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
