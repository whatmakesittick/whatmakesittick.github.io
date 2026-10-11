import { existsSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  ENV,
  ROUTES,
  SERVER_NAME,
  SERVER_VERSION,
} from '../shared/config.ts';
import { LOADER_VERSION } from '../shared/loader.ts';
import { claudeAppDomain, resolveAssetBase } from './assets.ts';
import { createServer, type CreateServerOptions } from './createServer.ts';
import { createHttpHandler, type HealthInfo, type HttpHandler } from './http.ts';
import {
  loadAliases,
  loadCatalogue,
  loaderHtml,
  parseExcludeTags,
  siteDir,
  widgetModuleKind,
} from './load.ts';
import { log } from './log.ts';

const stdio = process.argv.includes('--stdio');
const port = Number.parseInt(process.env[ENV.port] ?? '', 10) || DEFAULT_PORT;
const { catalogue, kind: catalogueKind } = loadCatalogue();
const aliases = loadAliases(catalogue);
const site = siteDir();
const publicUrl = stdio ? undefined : process.env[ENV.publicUrl] || undefined;
const assetBase = resolveAssetBase({
  assetBase: process.env[ENV.assetBase] || undefined,
  publicUrl,
  port,
});
const domain = await claudeAppDomain(publicUrl);
const excludeTags = parseExcludeTags(process.env[ENV.excludeTags]);

const serverOptions: CreateServerOptions = {
  catalogue,
  aliases,
  loaderHtml: loaderHtml(),
  assetBase,
  domain,
  excludeTags,
  ...(process.env[ENV.logRequests] ? { logHostContext: (line: string) => log(line) } : {}),
};

const health = (): HealthInfo => ({
  ok: true,
  name: SERVER_NAME,
  version: SERVER_VERSION,
  mode: stdio ? 'stdio-assets' : 'http',
  catalogue: { source: catalogueKind, explainers: catalogue.explainers.length },
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
      createServer: () => createServer(serverOptions),
      siteDir: site,
      health,
    }),
    '0.0.0.0',
  );
  log(
    `MCP on http://localhost:${port}${ROUTES.mcp}, assets ${assetBase}, health http://localhost:${port}${ROUTES.healthz}`,
  );
  log(domain ? `ui.domain ${domain} (for ${publicUrl})` : 'ui.domain unset (no MCP_PUBLIC_URL)');
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startStdio(): Promise<void> {
  await ensureAssetServer();
  const transport = new StdioServerTransport();
  transport.onclose = () => process.exit(0);
  process.stdin.on('end', () => process.exit(0));
  await createServer(serverOptions).connect(transport);
  log(
    `stdio ready (catalogue: ${catalogueKind}, loader v${LOADER_VERSION}, widget module ${widgetModuleKind()}, assets ${assetBase})`,
  );
}

(stdio ? startStdio() : startHttp()).catch((error: unknown) => {
  log('fatal:', error);
  process.exit(1);
});
