import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer, type ReadResourceResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { TAGS, type Catalogue, type CatalogueEntry, type Tag } from '../shared/catalogue.ts';
import { SERVER_NAME, SERVER_VERSION } from '../shared/config.ts';
import {
  OPENAI_INVOCATION_META,
  SHOW_EXPLAINER_CHAPTER_DESCRIBE,
  TOOL_ANNOTATIONS,
  TOOL_LIST_EXPLAINERS,
  TOOL_SHOW_EXPLAINER,
  WIDGET_RESOURCE_DESCRIPTION,
  WIDGET_RESOURCE_NAME,
  WIDGET_RESOURCE_URI,
} from '../shared/tools.ts';
import { buildUiMeta } from './assets.ts';
import {
  LANG_DESCRIBE,
  LIST_EXPLAINERS_DESCRIPTION,
  buildShowExplainerDescription,
  type Aliases,
} from './description.ts';
import { injectAssetBase, injectReportContext } from './html.ts';
import { listExplainers } from './tools/listExplainers.ts';
import { showExplainer } from './tools/showExplainer.ts';

export { SERVER_NAME, SERVER_VERSION };

export interface CreateServerOptions {
  catalogue: Catalogue;
  aliases: Aliases;
  loaderHtml: string;
  assetBase: string;
  domain?: string;
  excludeTags?: readonly Tag[];
}

export function availableSlugs(catalogue: Catalogue, excludeTags: readonly Tag[] = []): string[] {
  return catalogue.explainers
    .filter((e) => !e.tags.some((t) => excludeTags.includes(t)))
    .map((e) => e.slug)
    .sort();
}

export function createServer(options: CreateServerOptions): McpServer {
  const { catalogue, aliases, assetBase, domain } = options;
  const slugs = availableSlugs(catalogue, options.excludeTags);
  const entries: CatalogueEntry[] = catalogue.explainers.filter((e) => slugs.includes(e.slug));
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const uiMeta = buildUiMeta(assetBase, domain);

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerAppTool(
    server,
    TOOL_SHOW_EXPLAINER,
    {
      title: 'Show a 3D explainer',
      description: buildShowExplainerDescription(aliases, slugs),
      inputSchema: z.object({
        slug: z.enum(slugs as [string, ...string[]]).describe('Which explainer to show.'),
        chapter: z.string().optional().describe(SHOW_EXPLAINER_CHAPTER_DESCRIBE),
        lang: z.string().max(35).optional().describe(LANG_DESCRIBE),
      }),
      annotations: { ...TOOL_ANNOTATIONS },
      _meta: { ui: { resourceUri: WIDGET_RESOURCE_URI }, ...OPENAI_INVOCATION_META },
    },
    async (args) => showExplainer(bySlug, args),
  );

  server.registerTool(
    TOOL_LIST_EXPLAINERS,
    {
      title: 'List 3D explainers',
      description: LIST_EXPLAINERS_DESCRIPTION,
      inputSchema: z.object({
        tag: z.enum(TAGS).optional().describe('Only explainers with this tag.'),
        lang: z.string().max(35).optional().describe(LANG_DESCRIBE),
      }),
      annotations: { ...TOOL_ANNOTATIONS },
    },
    async (args) => listExplainers(entries, args),
  );

  registerAppResource(
    server,
    WIDGET_RESOURCE_NAME,
    WIDGET_RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: WIDGET_RESOURCE_DESCRIPTION,
      _meta: { ui: uiMeta },
    },
    async (): Promise<ReadResourceResult> => {
      const html = injectReportContext(injectAssetBase(options.loaderHtml, assetBase));
      return {
        contents: [
          {
            uri: WIDGET_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: { ui: uiMeta },
          },
        ],
      };
    },
  );

  return server;
}
