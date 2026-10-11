import type { CallToolResult } from '@modelcontextprotocol/server';
import { EMBED_API_VERSION } from '../../../src/core/embed/manifest.ts';
import type { CatalogueEntry } from '../../shared/catalogue.ts';
import type { ShowExplainerResult } from '../../shared/tools.ts';
import { resolveChapter } from '../chapters.ts';
import { showExplainerText } from '../text.ts';

export function showExplainer(
  entries: ReadonlyMap<string, CatalogueEntry>,
  args: { slug: string; chapter?: string },
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

  const res = resolveChapter(entry, args.chapter);
  const result: ShowExplainerResult = {
    slug: entry.slug,
    chapter: res.chapter.id,
    chapterIndex: res.chapter.index,
    chapterCount: entry.chapters.length,
    title: entry.title,
    chapterTitle: res.chapter.title,
    url: entry.url,
    apiVersion: EMBED_API_VERSION,
  };
  return {
    content: [{ type: 'text', text: showExplainerText(entry, res, args.chapter) }],
    structuredContent: { ...result },
  };
}
