import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import sirv from 'sirv';
import type { Plugin, ViteDevServer } from 'vite';
import { crawlFiles } from './crawl.ts';
import { EXPLAINERS_DIRECTORY, PUBLIC_DIRECTORY } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import { renderCatalogueModule } from './page.ts';
import {
  CORE_DIRECTORY,
  NOT_FOUND_ENTRY,
  SITE_ENTRY,
  generateSite,
  renderNotFoundEntry,
  renderSiteEntry,
} from './sitePages.ts';
import type { Site } from './sitePages.ts';

const WATCHED_DIRECTORIES = [EXPLAINERS_DIRECTORY, CORE_DIRECTORY];
const PAGE_SOURCES = /(?:explainer\.json|\.html|locales[\\/]\w+\.json)$/;
const MOVED_PERMANENTLY = 301;
const PLUGIN_NAME = 'explainer-pages';
const CATALOGUE_MODULE = 'virtual:explainer-catalogue';
const RESOLVED_CATALOGUE_MODULE = `\0${CATALOGUE_MODULE}`;

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

function rollupInputs(root: string, folders: readonly string[]): Record<string, string> {
  return {
    main: join(root, SITE_ENTRY),
    notFound: join(root, NOT_FOUND_ENTRY),
    ...Object.fromEntries(folders.map((folder) => [folder, join(root, folder, SITE_ENTRY)])),
  };
}

function isWatchedPath(root: string, path: string): boolean {
  const relativePath = relative(root, path);
  return WATCHED_DIRECTORIES.some(
    (directory) => relativePath === directory || relativePath.startsWith(directory + sep),
  );
}

function isPageSource(root: string, file: string): boolean {
  if (resolve(file) === join(root, SITE_ENTRY)) return true;
  return isWatchedPath(root, file) && PAGE_SOURCES.test(file);
}

function redirectToTrailingSlash(server: ViteDevServer, folders: () => string[]): void {
  server.middlewares.use((request, response, next) => {
    const [path, query] = (request.url ?? '').split('?');
    const isPage = folders().some((folder) => path === `${server.config.base}${folder}`);
    if (!isPage) return next();
    response.statusCode = MOVED_PERMANENTLY;
    response.setHeader('Location', `${path}/${query ? `?${query}` : ''}`);
    response.end();
  });
}

function serveCrawlFiles(server: ViteDevServer, explainers: () => LoadedExplainer[]): void {
  server.middlewares.use((request, response, next) => {
    const [path] = (request.url ?? '').split('?');
    const file = crawlFiles(explainers()).find(
      ({ fileName }) => path === `${server.config.base}${fileName}`,
    );
    if (!file) return next();
    response.setHeader('Content-Type', file.contentType);
    response.end(file.source);
  });
}

function reloadPages(server: ViteDevServer): void {
  const { moduleGraph } = server.environments.client;
  const catalogue = moduleGraph.getModuleById(RESOLVED_CATALOGUE_MODULE);
  if (catalogue) moduleGraph.invalidateModule(catalogue);
  server.ws.send({ type: 'full-reload' });
}

function reportFailure(server: ViteDevServer, error: unknown): void {
  const failure = error instanceof Error ? error : new Error(String(error));
  server.config.logger.error(`[${PLUGIN_NAME}] ${failure.message}`, {
    timestamp: true,
    error: failure,
  });
  server.ws.send({
    type: 'error',
    err: { message: failure.message, stack: failure.stack ?? '', plugin: PLUGIN_NAME },
  });
}

function servePublicFiles(server: ViteDevServer, explainers: LoadedExplainer[]): void {
  for (const { manifest, directory } of explainers) {
    const files = sirv(join(directory, PUBLIC_DIRECTORY), { dev: true });
    server.middlewares.use(`${server.config.base}${manifest.slug}`, files);
  }
}

export function explainerPages(): Plugin {
  let root = process.cwd();
  let site: Site | undefined;

  return {
    name: PLUGIN_NAME,

    config(config, env) {
      root = resolve(config.root ?? process.cwd());
      if (env.mode === 'test' || env.isPreview) return;
      site = generateSite(root);
      return { build: { rolldownOptions: { input: rollupInputs(root, site.folders) } } };
    },

    resolveId(id) {
      return id === CATALOGUE_MODULE ? RESOLVED_CATALOGUE_MODULE : undefined;
    },

    load(id) {
      if (id !== RESOLVED_CATALOGUE_MODULE) return undefined;
      return renderCatalogueModule(site?.explainers ?? []);
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (!site) return html;
        const file = resolve(context.filename);
        if (file === join(root, SITE_ENTRY)) return renderSiteEntry(html, site);
        if (file === join(root, NOT_FOUND_ENTRY)) return renderNotFoundEntry(html, site);
        return html;
      },
    },

    configureServer(server) {
      redirectToTrailingSlash(server, () => site?.folders ?? []);
      servePublicFiles(server, site?.explainers ?? []);
      serveCrawlFiles(server, () => site?.explainers ?? []);
      const regenerate = () => {
        try {
          site = generateSite(root);
        } catch (error) {
          reportFailure(server, error);
          return;
        }
        reloadPages(server);
      };
      const onFile = (file: string) => {
        if (isPageSource(root, file)) regenerate();
      };
      const onRemovedDirectory = (directory: string) => {
        if (isWatchedPath(root, directory)) regenerate();
      };
      server.watcher.on('add', onFile);
      server.watcher.on('change', onFile);
      server.watcher.on('unlink', onFile);
      server.watcher.on('unlinkDir', onRemovedDirectory);
    },

    generateBundle() {
      const explainers = site?.explainers ?? [];
      for (const { fileName, source } of crawlFiles(explainers)) {
        this.emitFile({ type: 'asset', fileName, source });
      }
      for (const { manifest, directory } of explainers) {
        const publicDirectory = join(directory, PUBLIC_DIRECTORY);
        for (const file of listFiles(publicDirectory)) {
          const path = relative(publicDirectory, file).split(sep).join('/');
          this.emitFile({
            type: 'asset',
            fileName: `${manifest.slug}/${path}`,
            source: readFileSync(file),
          });
        }
      }
    },
  };
}
