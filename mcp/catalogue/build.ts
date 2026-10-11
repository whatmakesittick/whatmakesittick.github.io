import { parse } from 'node-html-parser';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '../../src/core/i18n/languages.ts';
import type { LanguageCode } from '../../src/core/i18n/languages.ts';
import type { Dictionary } from '../../src/core/i18n/resources.ts';
import { chapterOutline } from '../../vite/chapterOutline.ts';
import { loadExplainers } from '../../vite/manifest.ts';
import type { LoadedExplainer } from '../../vite/manifest.ts';
import { explainerUrl } from '../../vite/site.ts';
import { localizeEntry } from '../shared/catalogue.ts';
import type {
  BakedCatalogue,
  Catalogue,
  CatalogueChapter,
  CatalogueEntry,
  CatalogueLocalized,
  CatalogueLocalizedChapter,
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

export function localizedChapters(
  chaptersHtml: string,
  dictionary: Dictionary,
): CatalogueLocalizedChapter[] {
  return chapterOutline(chaptersHtml).map(({ id, paragraphs }) => {
    const title = lookup(dictionary, `sections.${id}.title`);
    return {
      id,
      ...(title?.trim() ? { title: plainText(title) } : {}),
      paragraphs: paragraphs.flatMap((key) => {
        const html = lookup(dictionary, key)?.trim();
        return html ? [{ key, html, text: plainText(html) }] : [];
      }),
    };
  });
}

function partLabels(dictionary: Dictionary | undefined): string[] {
  const parts = dictionary?.parts;
  if (typeof parts !== 'object') return [];
  return Object.values(parts).filter((part): part is string => typeof part === 'string');
}

function translations({
  metas,
  dictionaries,
  chapters,
}: LoadedExplainer): Partial<Record<LanguageCode, CatalogueLocalized>> {
  const out: Partial<Record<LanguageCode, CatalogueLocalized>> = {};
  for (const lang of LANGUAGE_CODES) {
    const dictionary = dictionaries[lang];
    const meta = metas[lang];
    if (lang === DEFAULT_LANGUAGE || !dictionary || !meta) continue;
    out[lang] = {
      title: meta.title,
      eyebrow: meta.eyebrow,
      tagline: meta.tagline,
      description: meta.description,
      summary: meta.summary,
      parts: partLabels(dictionary),
      chapters: localizedChapters(chapters, dictionary),
    };
  }
  return out;
}

export function catalogueEntry(loaded: LoadedExplainer): CatalogueEntry {
  const { manifest, meta, dictionaries, chapters } = loaded;
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
    locales: translations(loaded),
  };
}

export function buildCatalogue(root: string, generatedAt = new Date().toISOString()): Catalogue {
  return { generatedAt, explainers: loadExplainers(root).map(catalogueEntry) };
}

export function toWidgetCatalogue(
  catalogue: Catalogue,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): WidgetCatalogue {
  return {
    explainers: catalogue.explainers
      .map((entry) => localizeEntry(entry, lang))
      .map(({ slug, title, eyebrow, summary, tags, cover, chapters }) => ({
        slug,
        title,
        eyebrow,
        summary,
        tags,
        cover,
        chapters: chapters.map(({ id, title: chapterTitle }) => ({ id, title: chapterTitle })),
      })),
  };
}

export function toBakedCatalogue(
  catalogue: Catalogue,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): BakedCatalogue {
  const taglines = Object.fromEntries(
    catalogue.explainers.map((entry) => [entry.slug, localizeEntry(entry, lang).tagline]),
  );
  return { ...toWidgetCatalogue(catalogue, lang), taglines };
}
