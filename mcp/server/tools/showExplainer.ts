import type { CallToolResult } from '@modelcontextprotocol/server';
import { EMBED_API_VERSION } from '../../../src/core/embed/manifest.ts';
import {
  localizeEntry,
  resolveLanguage,
  resolveSlug,
  type CatalogueEntry,
  type SlugAliases,
} from '../../shared/catalogue.ts';
import type {
  ShowExplainerErrorResult,
  ShowExplainerInput,
  ShowExplainerResult,
  WidgetScope,
} from '../../shared/tools.ts';
import { resolveChapter } from '../chapters.ts';
import { log } from '../log.ts';
import type { Site } from '../site.ts';
import { showExplainerText } from '../text.ts';

function failure({ slugs, tags }: WidgetScope, text: string): CallToolResult {
  const structured: ShowExplainerErrorResult = { slugs: [...slugs], allowedTags: [...tags] };
  return { isError: true, content: [{ type: 'text', text }], structuredContent: { ...structured } };
}

export async function showExplainer(
  site: Pick<Site, 'entry'>,
  scope: WidgetScope,
  args: ShowExplainerInput,
  aliases: SlugAliases = {},
): Promise<CallToolResult> {
  const { slugs } = scope;
  const slug = resolveSlug(args.slug, aliases);
  if (!slugs.includes(slug)) {
    return failure(
      scope,
      `Unknown explainer slug "${args.slug}". Available slugs: ${slugs.join(', ')}. Call list_explainers to see them with their chapters.`,
    );
  }

  const lang = resolveLanguage(args.lang);
  let entry: CatalogueEntry | undefined;
  try {
    entry = await site.entry(slug, lang);
  } catch (error) {
    log(`show_explainer ${slug}:`, error);
  }
  if (!entry) {
    return failure(
      scope,
      `The data for the explainer "${slug}" is unavailable right now. Try again later.`,
    );
  }
  const localized = localizeEntry(entry, lang);
  const res = resolveChapter(entry, args.chapter, lang);
  const { chapter } = res;
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
    slugs: [...slugs],
    allowedTags: [...scope.tags],
  };
  return {
    content: [{ type: 'text', text: showExplainerText(localized, res, scope, args.chapter) }],
    structuredContent: { ...result },
  };
}
