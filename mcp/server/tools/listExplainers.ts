import type { CallToolResult } from '@modelcontextprotocol/server';
import type { CatalogueEntry, Tag } from '../../shared/catalogue.ts';
import type { ListExplainersResult } from '../../shared/tools.ts';
import { listExplainersText } from '../text.ts';

export function listExplainers(
  entries: readonly CatalogueEntry[],
  args: { tag?: Tag },
): CallToolResult {
  const picked = args.tag ? entries.filter((e) => e.tags.includes(args.tag as Tag)) : [...entries];
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
