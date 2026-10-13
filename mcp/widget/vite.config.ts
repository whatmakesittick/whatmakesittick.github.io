import { createReadStream, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { buildCatalogue } from '../../vite/catalogue.ts';
import { embedCatalogue, renderEmbedCatalogue } from '../../vite/embedCatalogue.ts';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  isLanguageCode,
  type LanguageCode,
} from '../../src/core/i18n/languages.ts';
import { PATHS } from '../shared/config.ts';

const MCP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = resolve(MCP_ROOT, '..');
const LANGUAGES_MODULE = 'virtual:wmit-languages';
const LANGUAGE_PREFIX = 'virtual:wmit-language/';
const SITE_PREFIX = '/site/';
const SLOW_PREFIX = /^slow\/(\d+)\//;
const CATALOGUE_PATH = /^embed\/v1\/catalogue\/([a-z]+)\.js$/;
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

function languageModule(lang: LanguageCode): string {
  const core: unknown = JSON.parse(
    readFileSync(resolve(REPOSITORY_ROOT, `src/core/locales/${lang}.json`), 'utf8'),
  );
  const strings = resolve(MCP_ROOT, `widget/src/i18n/locales/${lang}.ts`);
  const data = JSON.stringify({ core });
  return `import widget from ${JSON.stringify(strings)};\nexport default { ...${data}, widget };`;
}

function languagesModule(): string {
  const entries = LANGUAGE_CODES.filter((lang) => lang !== DEFAULT_LANGUAGE).map(
    (lang) => `  ${lang}: () => import('${LANGUAGE_PREFIX}${lang}').then((m) => m.default),`,
  );
  return `export default {\n${entries.join('\n')}\n};`;
}

function languages(): Plugin {
  const virtual = (id: string) => id === LANGUAGES_MODULE || id.startsWith(LANGUAGE_PREFIX);
  return {
    name: 'wmit-widget-languages',
    resolveId: (id) => (virtual(id) ? `\0${id}` : undefined),
    load(id) {
      if (!id.startsWith('\0') || !virtual(id.slice(1))) return undefined;
      const name = id.slice(1);
      if (name === LANGUAGES_MODULE) return languagesModule();
      const lang = name.slice(LANGUAGE_PREFIX.length);
      return isLanguageCode(lang) ? languageModule(lang) : undefined;
    },
  };
}

function catalogueModule(path: string): string | undefined {
  const lang = CATALOGUE_PATH.exec(path)?.[1];
  if (!lang || !isLanguageCode(lang)) return undefined;
  return renderEmbedCatalogue(embedCatalogue(buildCatalogue(REPOSITORY_ROOT).explainers, lang));
}

function pruneChunks(): Plugin {
  return {
    name: 'wmit-widget-prune-chunks',
    apply: 'build',
    writeBundle(options, bundle) {
      const dir = options.dir;
      if (!dir) return;
      for (const file of readdirSync(dir)) {
        if (/^widget-.+\.js$/.test(file) && !(file in bundle)) rmSync(join(dir, file));
      }
    },
  };
}

function siteFile(path: string): string | undefined {
  const built = normalize(join(REPOSITORY_ROOT, PATHS.site, path));
  const [slug, ...rest] = path.split('/');
  const source = normalize(join(REPOSITORY_ROOT, 'explainers', slug ?? '', 'public', ...rest));
  return [built, source].find(
    (file) => file.startsWith(REPOSITORY_ROOT + sep) && existsSync(file) && statSync(file).isFile(),
  );
}

function devSite(): Plugin {
  return {
    name: 'wmit-widget-dev-site',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        if (!url.startsWith(SITE_PREFIX)) return next();
        const path = decodeURIComponent(url.slice(SITE_PREFIX.length));
        const slow = SLOW_PREFIX.exec(path);
        const local = slow ? path.slice(slow[0].length) : path;
        const generated = catalogueModule(local);
        const file = generated === undefined ? siteFile(local) : undefined;
        if (generated === undefined && !file) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader('Content-Type', CONTENT_TYPES[extname(local)] ?? 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');
        setTimeout(
          () => (file ? createReadStream(file).pipe(res) : res.end(generated)),
          Number(slow?.[1] ?? 0),
        );
      });
    },
  };
}

export default defineConfig({
  root: resolve(MCP_ROOT, 'widget'),
  base: './',
  envDir: false,
  publicDir: false,
  cacheDir: resolve(REPOSITORY_ROOT, 'node_modules/.vite-widget'),
  logLevel: 'warn',
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  server: { port: 5183, fs: { allow: [REPOSITORY_ROOT] } },
  plugins: [languages(), devSite(), pruneChunks()],
  build: {
    outDir: dirname(resolve(REPOSITORY_ROOT, PATHS.widgetModule)),
    emptyOutDir: false,
    target: 'es2022',
    modulePreload: false,
    reportCompressedSize: false,
    assetsInlineLimit: () => true,
    rolldownOptions: {
      input: { widget: resolve(MCP_ROOT, 'widget/src/start.tsx') },
      preserveEntrySignatures: 'strict',
      output: {
        format: 'es',
        entryFileNames: basename(PATHS.widgetModule),
        chunkFileNames: 'widget-[name]-[hash].js',
      },
    },
  },
});
