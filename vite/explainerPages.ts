import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import sirv from 'sirv';
import type { Plugin, ViteDevServer } from 'vite';
import { EXPLAINERS_DIRECTORY, PUBLIC_DIRECTORY, loadExplainers } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import { renderCatalogueModule, renderEntry, renderPage, siteValues } from './page.ts';
import { REPOSITORY_URL } from './site.ts';
import { expandPartials, fillTemplate } from './template.ts';
import type { TemplateValues } from './template.ts';

const CORE_DIRECTORY = join('src', 'core');
const PAGE_TEMPLATE = join(CORE_DIRECTORY, 'page.html');
const PARTIALS_DIRECTORY = join(CORE_DIRECTORY, 'partials');
const PARTIAL_EXTENSION = '.html';
const SITE_ENTRY = 'index.html';
const PAGE_ENTRY = 'main.ts';
const IGNORE_FILE = '.gitignore';
const IGNORE_EVERYTHING = '*\n';
const PAGE_SOURCES = /(?:explainer\.json|\.html|locales[\\/]\w+\.json)$/;
const MOVED_PERMANENTLY = 301;
const PLUGIN_NAME = 'explainer-pages';
const CATALOGUE_MODULE = 'virtual:explainer-catalogue';
const RESOLVED_CATALOGUE_MODULE = `\0${CATALOGUE_MODULE}`;

function writeIfChanged(file: string, content: string): void {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return;
  writeFileSync(file, content);
}

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
    const directory = join(root, explainer.manifest.slug);
    mkdirSync(directory, { recursive: true });
    writeIfChanged(join(directory, IGNORE_FILE), IGNORE_EVERYTHING);
    writeIfChanged(join(directory, SITE_ENTRY), renderPage(template, partials, explainer));
    writeIfChanged(join(directory, PAGE_ENTRY), renderEntry(explainer.manifest));
  }
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

function isPageSource(root: string, file: string): boolean {
  const path = relative(root, file);
  const watched = [EXPLAINERS_DIRECTORY + sep, CORE_DIRECTORY + sep];
  return watched.some((prefix) => path.startsWith(prefix)) && PAGE_SOURCES.test(path);
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
      const regenerate = (file: string) => {
        if (!isPageSource(root, file)) return;
        try {
          explainers = generatePages(root);
        } catch (error) {
          reportFailure(server, error);
          return;
        }
        reloadPages(server);
      };
      server.watcher.on('change', regenerate);
      server.watcher.on('add', regenerate);
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
