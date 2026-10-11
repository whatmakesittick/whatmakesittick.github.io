import type { CallToolResult } from '@modelcontextprotocol/server';
import {
  localizeEntry,
  resolveLanguage,
  type CatalogueEntry,
  type Tag,
} from '../../shared/catalogue.ts';
import type { ListExplainersInput, ListExplainersResult } from '../../shared/tools.ts';
import { listExplainersText } from '../text.ts';

export function listExplainers(
  entries: readonly CatalogueEntry[],
  args: ListExplainersInput,
): CallToolResult {
  const lang = resolveLanguage(args.lang);
  const picked = (args.tag ? entries.filter((e) => e.tags.includes(args.tag as Tag)) : entries).map(
    (e) => localizeEntry(e, lang),
  );
  const result: ListExplainersResult = {
    explainers: picked.map(({ slug, title, summary, tags, chapters }) => ({
      slug,
      title,
      summary,
      tags,
      chapters: chapters.map(({ id, title: t }) => ({ id, title: t })),
    })),
  };
  return {
    content: [{ type: 'text', text: listExplainersText(picked, args.tag) }],
    structuredContent: { ...result },
  };
}
