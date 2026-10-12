import { existsSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { join } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { EmbedManifest } from '../../src/core/embed/manifest.ts';
import { EMBED_DIRECTORY } from '../../vite/embedPaths.ts';
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  ENV,
  PATHS,
  ROUTES,
  SERVER_NAME,
  SERVER_VERSION,
} from '../shared/config.ts';
import { LOADER_VERSION } from '../shared/loader.ts';
import { claudeAppDomain, remoteSiteBase, resolveAssetBase } from './assets.ts';
import { createServer, type CreateServerOptions } from './createServer.ts';
import { createHttpHandler, type HealthInfo, type HttpHandler } from './http.ts';
import {
  fileReader,
  loaderHtml,
  parseAllowedOrigins,
  parseExcludeTags,
  siteDir,
  widgetModuleKind,
} from './load.ts';
import { log } from './log.ts';
import { SITE_INDEX_FILE, createSite, httpReader } from './site.ts';

const stdio = process.argv.includes('--stdio');
const port = Number.parseInt(process.env[ENV.port] ?? '', 10) || DEFAULT_PORT;
const localSite = process.env[ENV.siteDir] || PATHS.site;
const bindHost = process.env[ENV.host] || DEFAULT_HOST;
const allowedOrigins = parseAllowedOrigins(process.env[ENV.allowedOrigins]);
const site = siteDir(localSite);
const publicUrl = stdio ? undefined : process.env[ENV.publicUrl] || undefined;
const assetInput = { assetBase: process.env[ENV.assetBase] || undefined, publicUrl, port };
const assetBase = resolveAssetBase(assetInput);
const remote = stdio ? undefined : remoteSiteBase(assetInput);
const source = remote ?? `${localSite}/${EMBED_DIRECTORY}`;
const indexAt = remote ? new URL(SITE_INDEX_FILE, remote).href : `${source}/${SITE_INDEX_FILE}`;
const domain = await claudeAppDomain(publicUrl);
const excludeTags = parseExcludeTags(process.env[ENV.excludeTags]);
const loader = loaderHtml();
const explainers = createSite(
  remote ? httpReader(remote) : fileReader(join(site, EMBED_DIRECTORY)),
);
let lastIndex: EmbedManifest | undefined;

async function readIndex(): Promise<EmbedManifest> {
  lastIndex = await explainers.index();
  return lastIndex;
}

async function startIndex(): Promise<void> {
  try {
    await readIndex();
  } catch (error) {
    log(`catalogue unavailable at ${indexAt} (npm run build)`);
    log(error);
    process.exit(1);
  }
}

async function serverOptions(): Promise<CreateServerOptions> {
  return {
    index: await readIndex(),
    site: explainers,
    loaderHtml: loader,
    assetBase,
    domain,
    excludeTags,
  };
}

const health = (): HealthInfo => ({
  ok: true,
  name: SERVER_NAME,
  version: SERVER_VERSION,
  mode: stdio ? 'stdio-assets' : 'http',
  catalogue: { source, explainers: lastIndex?.explainers.length ?? 0 },
  widget: { loader: LOADER_VERSION, module: widgetModuleKind() },
  site: existsSync(site) ? 'built' : 'missing',
  assetBase,
});

function listen(handler: HttpHandler, host: string): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createHttpServer(handler);
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

async function runningInstance(): Promise<boolean> {
  try {
    const res = await fetch(`http://${DEFAULT_HOST}:${port}${ROUTES.healthz}`, {
      signal: AbortSignal.timeout(700),
    });
    const body = (await res.json()) as Partial<HealthInfo>;
    return res.ok && body.name === SERVER_NAME;
  } catch {
    return false;
  }
}

async function ensureAssetServer(): Promise<void> {
  if (await runningInstance()) {
    log(`assets: reusing the server already on http://${DEFAULT_HOST}:${port}`);
    return;
  }
  try {
    const server = await listen(createHttpHandler({ siteDir: site, health }), DEFAULT_HOST);
    server.unref();
    log(`assets: serving ${ROUTES.embed} on http://${DEFAULT_HOST}:${port}`);
  } catch (error) {
    log(
      `assets: could not listen on ${DEFAULT_HOST}:${port} (${(error as Error).message}), the widget will not load 3D modules`,
    );
  }
}

async function startHttp(): Promise<void> {
  const server = await listen(
    createHttpHandler({
      createServer: async () => createServer(await serverOptions()),
      siteDir: site,
      health,
      allowedOrigins,
    }),
    bindHost,
  );
  await startIndex();
  log(
    `MCP bound to ${bindHost}:${port}, http://localhost:${port}${ROUTES.mcp}, assets ${assetBase}, health http://localhost:${port}${ROUTES.healthz}`,
  );
  log(domain ? `ui.domain ${domain} (for ${publicUrl})` : 'ui.domain unset (no MCP_PUBLIC_URL)');
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startStdio(): Promise<void> {
  await ensureAssetServer();
  await startIndex();
  const transport = new StdioServerTransport();
  transport.onclose = () => process.exit(0);
  process.stdin.on('end', () => process.exit(0));
  await createServer(await serverOptions()).connect(transport);
  log(
    `stdio ready (${lastIndex?.explainers.length ?? 0} explainers, loader v${LOADER_VERSION}, widget module ${widgetModuleKind()}, assets ${assetBase})`,
  );
}

(stdio ? startStdio() : startHttp()).catch((error: unknown) => {
  log('fatal:', error);
  process.exit(1);
});
