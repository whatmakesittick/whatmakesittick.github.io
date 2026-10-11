import type { CallToolResult } from '@modelcontextprotocol/server';
import { EMBED_API_VERSION } from '../../../src/core/embed/manifest.ts';
import { localizeEntry, resolveLanguage, type CatalogueEntry } from '../../shared/catalogue.ts';
import type { ShowExplainerInput, ShowExplainerResult } from '../../shared/tools.ts';
import { resolveChapter } from '../chapters.ts';
import { showExplainerText } from '../text.ts';

export function showExplainer(
  entries: ReadonlyMap<string, CatalogueEntry>,
  args: ShowExplainerInput,
): CallToolResult {
  const entry = entries.get(args.slug);
  if (!entry) {
    const why = `Unknown explainer slug "${args.slug}".`;
    const have = [...entries.keys()];
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `${why} Available slugs: ${have.join(', ')}. Call list_explainers to see them with their chapters.`,
        },
      ],
    };
  }

  const lang = resolveLanguage(args.lang);
  const localized = localizeEntry(entry, lang);
  const found = resolveChapter(entry, args.chapter);
  const chapter = localized.chapters.find((c) => c.id === found.chapter.id) ?? found.chapter;
  const res = { ...found, chapter };
  const result: ShowExplainerResult = {
    slug: entry.slug,
    chapter: chapter.id,
    chapterIndex: chapter.index,
    chapterCount: localized.chapters.length,
    title: localized.title,
    chapterTitle: chapter.title,
    url: entry.url,
    apiVersion: EMBED_API_VERSION,
    ...(args.lang === undefined ? {} : { lang }),
  };
  return {
    content: [{ type: 'text', text: showExplainerText(localized, res, args.chapter) }],
    structuredContent: { ...result },
  };
}
