import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer, type ReadResourceResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { SITE_URL } from '../../vite/site.ts';
import type { EmbedManifest, EmbedManifestEntry } from '../../src/core/embed/manifest.ts';
import { isSlug, resolveSlug, type SlugAliases } from '../shared/catalogue.ts';
import { SERVER_NAME, SERVER_TITLE, SERVER_VERSION } from '../shared/config.ts';
import {
  OPENAI_INVOCATION_META,
  SHOW_EXPLAINER_CHAPTER_DESCRIBE,
  TOOL_ANNOTATIONS,
  TOOL_LIST_EXPLAINERS,
  TOOL_SHOW_EXPLAINER,
  WIDGET_RESOURCE_DESCRIPTION,
  WIDGET_RESOURCE_NAME,
  WIDGET_RESOURCE_URI,
  WIDGET_TAGS_META,
  type WidgetScope,
} from '../shared/tools.ts';
import { buildServerIcons, buildUiMeta } from './assets.ts';
import {
  LANG_DESCRIBE,
  LIST_EXPLAINERS_DESCRIPTION,
  buildShowExplainerDescription,
} from './description.ts';
import { injectAssetBase } from './html.ts';
import type { Site } from './site.ts';
import { listExplainers } from './tools/listExplainers.ts';
import { showExplainer } from './tools/showExplainer.ts';

export { SERVER_NAME, SERVER_VERSION };

export interface CreateServerOptions {
  index: EmbedManifest;
  site: Site;
  loaderHtml: string;
  assetBase: string;
  domain?: string;
  excludeTags?: readonly string[];
}

function availableExplainers(
  index: EmbedManifest,
  excludeTags: readonly string[],
): EmbedManifestEntry[] {
  return index.explainers.filter((e) => !e.tags.some((t) => excludeTags.includes(t)));
}

export function availableSlugs(
  index: EmbedManifest,
  excludeTags: readonly string[] = [],
): string[] {
  return availableExplainers(index, excludeTags)
    .map((e) => e.slug)
    .sort();
}

export function availableTags(index: EmbedManifest, excludeTags: readonly string[] = []): string[] {
  const tags = availableExplainers(index, excludeTags).flatMap((e) => e.tags);
  return [...new Set(tags.filter(isSlug))].sort();
}

export function knownAliases(index: EmbedManifest, slugs: readonly string[]): SlugAliases {
  return Object.fromEntries(
    Object.entries(index.aliases ?? {}).filter(([, slug]) =>
      slugs.includes(resolveSlug(slug, index.aliases)),
    ),
  );
}

export function slugInput(slugs: readonly string[], aliases: SlugAliases) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? resolveSlug(value, aliases) : value),
    z.enum(slugs as [string, ...string[]]),
  );
}

export function createServer(options: CreateServerOptions): McpServer {
  const { index, site, assetBase, domain } = options;
  const slugs = availableSlugs(index, options.excludeTags);
  const tags = availableTags(index, options.excludeTags);
  const scope: WidgetScope = { slugs, tags };
  const aliases = knownAliases(index, slugs);
  const listed = index.explainers.filter((e) => slugs.includes(e.slug));
  const topics = new Map(listed.map((e) => [e.slug, e.topic]));
  const uiMeta = buildUiMeta(assetBase, domain);

  const server = new McpServer({
    name: SERVER_NAME,
    title: SERVER_TITLE,
    version: SERVER_VERSION,
    websiteUrl: `${SITE_URL}/`,
    icons: buildServerIcons(assetBase),
  });

  registerAppTool(
    server,
    TOOL_SHOW_EXPLAINER,
    {
      title: 'Show a 3D explainer',
      description: buildShowExplainerDescription(topics, slugs),
      inputSchema: z.object({
        slug: slugInput(slugs, aliases).describe('Which explainer to show.'),
        chapter: z.string().optional().describe(SHOW_EXPLAINER_CHAPTER_DESCRIBE),
        lang: z.string().max(35).optional().describe(LANG_DESCRIBE),
      }),
      annotations: { ...TOOL_ANNOTATIONS },
      _meta: {
        ui: { resourceUri: WIDGET_RESOURCE_URI },
        [WIDGET_TAGS_META]: [...tags],
        ...OPENAI_INVOCATION_META,
      },
    },
    async (args) => showExplainer(site, scope, args, aliases),
  );

  server.registerTool(
    TOOL_LIST_EXPLAINERS,
    {
      title: 'List 3D explainers',
      description: LIST_EXPLAINERS_DESCRIPTION,
      inputSchema: z.object({
        tag: z
          .enum(tags as [string, ...string[]])
          .optional()
          .describe('Only explainers with this tag.'),
        lang: z.string().max(35).optional().describe(LANG_DESCRIBE),
      }),
      annotations: { ...TOOL_ANNOTATIONS },
    },
    async (args) => listExplainers(site, listed, args),
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
      const html = injectAssetBase(options.loaderHtml, assetBase);
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
