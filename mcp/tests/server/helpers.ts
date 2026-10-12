import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { buildCatalogue } from '../../../vite/catalogue.ts';
import { EMBED_DIRECTORY, embedManifest, embedSourceFiles } from '../../../vite/embed.ts';
import { loadExplainers } from '../../../vite/manifest.ts';
import { createServer, type CreateServerOptions } from '../../server/createServer.ts';
import { loaderHtml } from '../../server/load.ts';
import { createSite, type SiteReader } from '../../server/site.ts';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const catalogue = buildCatalogue(root, '2026-01-01T00:00:00.000Z');
export const topics = new Map(catalogue.explainers.map((e) => [e.slug, e.topic]));
export const index = embedManifest(catalogue.explainers);

export const files: ReadonlyMap<string, string> = new Map([
  ['manifest.json', JSON.stringify(index)],
  ...embedSourceFiles(loadExplainers(root)).map(
    ({ fileName, source }) =>
      [relative(EMBED_DIRECTORY, fileName), readFileSync(source, 'utf8')] as const,
  ),
]);

export const reader: SiteReader = async (path) => files.get(path);

export const ASSET_BASE = 'http://localhost:3999/embed/v1/';

export function serverOptions(over: Partial<CreateServerOptions> = {}): CreateServerOptions {
  return {
    index,
    site: createSite(reader),
    loaderHtml: loaderHtml(root),
    assetBase: ASSET_BASE,
    ...over,
  };
}

export async function connect(over: Partial<CreateServerOptions> = {}): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer(serverOptions(over)).connect(serverSide);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientSide);
  return client;
}

export const textOf = (result: { content?: unknown }): string =>
  ((result.content ?? []) as { type: string; text?: string }[]).find((c) => c.type === 'text')
    ?.text ?? '';

export const fixture = catalogue;
export const slugs = catalogue.explainers.map((e) => e.slug).sort();
export const catalogues: [string, typeof catalogue][] = [['site', catalogue]];
