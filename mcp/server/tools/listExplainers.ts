import type { CallToolResult } from '@modelcontextprotocol/server';
import type { EmbedManifestEntry } from '../../../src/core/embed/manifest.ts';
import { resolveLanguage } from '../../shared/catalogue.ts';
import type {
  ListExplainersInput,
  ListExplainersItem,
  ListExplainersResult,
} from '../../shared/tools.ts';
import { log } from '../log.ts';
import type { Site } from '../site.ts';
import { listExplainersText } from '../text.ts';

const UNAVAILABLE: CallToolResult = {
  isError: true,
  content: [
    { type: 'text', text: 'The list of explainers is unavailable right now. Try again later.' },
  ],
};

export async function listExplainers(
  site: Pick<Site, 'summary'>,
  listed: readonly EmbedManifestEntry[],
  args: ListExplainersInput,
): Promise<CallToolResult> {
  const lang = resolveLanguage(args.lang);
  const tagged = args.tag ? listed.filter((e) => e.tags.includes(args.tag as string)) : listed;
  let summaries: (ListExplainersItem | undefined)[];
  try {
    summaries = await Promise.all(tagged.map((e) => site.summary(e.slug, lang)));
  } catch (error) {
    log('list_explainers:', error);
    return UNAVAILABLE;
  }
  const result: ListExplainersResult = {
    explainers: summaries.filter((s): s is ListExplainersItem => s !== undefined),
  };
  return {
    content: [{ type: 'text', text: listExplainersText(result.explainers, args.tag) }],
    structuredContent: { ...result },
  };
}
