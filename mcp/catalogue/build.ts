import { parse } from 'node-html-parser';
import { DEFAULT_LANGUAGE } from '../../src/core/i18n/languages.ts';
import type { Dictionary } from '../../src/core/i18n/resources.ts';
import { chapterOutline } from '../../vite/chapterOutline.ts';
import { loadExplainers } from '../../vite/manifest.ts';
import type { LoadedExplainer } from '../../vite/manifest.ts';
import { explainerUrl } from '../../vite/site.ts';
import type {
  Catalogue,
  CatalogueChapter,
  CatalogueEntry,
  WidgetCatalogue,
} from '../shared/catalogue.ts';

const CHAPTER = 'section.chapter[data-preset]';

export function plainText(html: string): string {
  return parse(`<div>${html}</div>`).text.replace(/\s+/g, ' ').trim();
}

function lookup(dictionary: Dictionary | undefined, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary;
  for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined;
  return typeof node === 'string' ? node : undefined;
}

function need(dictionary: Dictionary | undefined, key: string, where: string): string {
  const value = lookup(dictionary, key);
  if (value === undefined || value.trim() === '') throw new Error(`${where}: missing "${key}"`);
  return value;
}

export function extractChapters(
  chaptersHtml: string,
  dictionary: Dictionary,
  slug: string,
): CatalogueChapter[] {
  const sections = parse(chaptersHtml).querySelectorAll(CHAPTER);
  return chapterOutline(chaptersHtml).map(({ id, paragraphs }, index) => {
    const where = `${slug}/${id}`;
    const section = sections[index];
    return {
      id,
      index: index + 1,
      title: plainText(need(dictionary, `sections.${id}.title`, where)),
      paragraphs: paragraphs.map((key) => {
        const html = need(dictionary, key, where).trim();
        return { key, html, text: plainText(html) };
      }),
      interactive: {
        range: section?.querySelector('.range-widget') != null,
        canvas: section?.querySelector('[data-canvas]') != null,
        action: section?.querySelector('[data-action]') != null,
        readouts: section?.querySelector('dl.readouts') != null,
      },
    };
  });
}

function partLabels(dictionary: Dictionary | undefined): string[] {
  const parts = dictionary?.parts;
  if (typeof parts !== 'object') return [];
  return Object.values(parts).filter((part): part is string => typeof part === 'string');
}

export function catalogueEntry({
  manifest,
  meta,
  dictionaries,
  chapters,
}: LoadedExplainer): CatalogueEntry {
  const dictionary = dictionaries[DEFAULT_LANGUAGE] ?? {};
  return {
    slug: manifest.slug,
    title: meta.title,
    eyebrow: meta.eyebrow,
    tagline: meta.tagline,
    description: meta.description,
    summary: meta.summary,
    tags: [...manifest.tags],
    url: explainerUrl(manifest.slug),
    cover: `../../${manifest.slug}/${manifest.cover}`,
    parts: partLabels(dictionary),
    chapters: extractChapters(chapters, dictionary, manifest.slug),
  };
}

export function buildCatalogue(root: string, generatedAt = new Date().toISOString()): Catalogue {
  return { generatedAt, explainers: loadExplainers(root).map(catalogueEntry) };
}

export function toWidgetCatalogue(catalogue: Catalogue): WidgetCatalogue {
  return {
    explainers: catalogue.explainers.map(
      ({ slug, title, eyebrow, summary, tags, cover, chapters }) => ({
        slug,
        title,
        eyebrow,
        summary,
        tags,
        cover,
        chapters: chapters.map(({ id, title: chapterTitle }) => ({ id, title: chapterTitle })),
      }),
    ),
  };
}
