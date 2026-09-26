import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import sirv from 'sirv';
import type { Plugin, ViteDevServer } from 'vite';
import { EXPLAINERS_DIRECTORY, PUBLIC_DIRECTORY, loadExplainers } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import { renderCatalogueModule, renderEntry, renderPage, siteValues } from './page.ts';
import { prunePageFolders, writePageFolder } from './pageFolders.ts';
import { REPOSITORY_URL } from './site.ts';
import { expandPartials, fillTemplate } from './template.ts';
import type { TemplateValues } from './template.ts';

const CORE_DIRECTORY = join('src', 'core');
const PAGE_TEMPLATE = join(CORE_DIRECTORY, 'page.html');
const PARTIALS_DIRECTORY = join(CORE_DIRECTORY, 'partials');
const PARTIAL_EXTENSION = '.html';
const SITE_ENTRY = 'index.html';
const PAGE_ENTRY = 'main.ts';
const WATCHED_DIRECTORIES = [EXPLAINERS_DIRECTORY, CORE_DIRECTORY];
const PAGE_SOURCES = /(?:explainer\.json|\.html|locales[\\/]\w+\.json)$/;
const MOVED_PERMANENTLY = 301;
const PLUGIN_NAME = 'explainer-pages';
const CATALOGUE_MODULE = 'virtual:explainer-catalogue';
const RESOLVED_CATALOGUE_MODULE = `\0${CATALOGUE_MODULE}`;

function readPartials(root: string): TemplateValues {
  const directory = join(root, PARTIALS_DIRECTORY);
  return Object.fromEntries(
    readdirSync(directory)
      .filter((file) => file.endsWith(PARTIAL_EXTENSION))
      .map((file) => [
        basename(file, PARTIAL_EXTENSION),
        readFileSync(join(directory, file), 'utf8'),
      ]),
  );
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

function generatePages(root: string): LoadedExplainer[] {
  const explainers = loadExplainers(root);
  const template = readFileSync(join(root, PAGE_TEMPLATE), 'utf8');
  const partials = readPartials(root);
  for (const explainer of explainers) {
    writePageFolder(root, explainer.manifest.slug, {
      [SITE_ENTRY]: renderPage(template, partials, explainer),
      [PAGE_ENTRY]: renderEntry(explainer.manifest),
    });
  }
  prunePageFolders(
    root,
    explainers.map(({ manifest }) => manifest.slug),
  );
  return explainers;
}

function rollupInputs(root: string, explainers: LoadedExplainer[]): Record<string, string> {
  return {
    main: join(root, SITE_ENTRY),
    ...Object.fromEntries(
      explainers.map(({ manifest }) => [manifest.slug, join(root, manifest.slug, SITE_ENTRY)]),
    ),
  };
}

function isWatchedPath(root: string, path: string): boolean {
  const relativePath = relative(root, path);
  return WATCHED_DIRECTORIES.some(
    (directory) => relativePath === directory || relativePath.startsWith(directory + sep),
  );
}

function isPageSource(root: string, file: string): boolean {
  return isWatchedPath(root, file) && PAGE_SOURCES.test(file);
}

function redirectToTrailingSlash(server: ViteDevServer, slugs: () => string[]): void {
  server.middlewares.use((request, response, next) => {
    const [path, query] = (request.url ?? '').split('?');
    const isPage = slugs().some((slug) => path === `${server.config.base}${slug}`);
    if (!isPage) return next();
    response.statusCode = MOVED_PERMANENTLY;
    response.setHeader('Location', `${path}/${query ? `?${query}` : ''}`);
    response.end();
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
  let explainers: LoadedExplainer[] = [];

  return {
    name: PLUGIN_NAME,

    config(config, env) {
      root = resolve(config.root ?? process.cwd());
      if (env.mode === 'test' || env.isPreview) return;
      explainers = generatePages(root);
      return { build: { rolldownOptions: { input: rollupInputs(root, explainers) } } };
    },

    resolveId(id) {
      return id === CATALOGUE_MODULE ? RESOLVED_CATALOGUE_MODULE : undefined;
    },

    load(id) {
      return id === RESOLVED_CATALOGUE_MODULE ? renderCatalogueModule(explainers) : undefined;
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (resolve(context.filename) !== join(root, SITE_ENTRY)) return html;
        return fillTemplate(expandPartials(html, readPartials(root)), siteValues(REPOSITORY_URL));
      },
    },

    configureServer(server) {
      redirectToTrailingSlash(server, () => explainers.map(({ manifest }) => manifest.slug));
      servePublicFiles(server, explainers);
      const regenerate = () => {
        try {
          explainers = generatePages(root);
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
