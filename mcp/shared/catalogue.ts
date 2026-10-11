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

export interface CatalogueEntry {
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
