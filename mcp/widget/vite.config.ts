import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { buildCatalogue, toWidgetCatalogue } from '../catalogue/build.ts';
import { PATHS } from '../shared/config.ts';

const MCP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = resolve(MCP_ROOT, '..');
const CATALOGUE_MODULE = 'virtual:wmit-catalogue';
const SITE_PREFIX = '/site/';
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

function catalogue(): Plugin {
  return {
    name: 'wmit-widget-catalogue',
    resolveId: (id) => (id === CATALOGUE_MODULE ? `\0${CATALOGUE_MODULE}` : undefined),
    load(id) {
      if (id !== `\0${CATALOGUE_MODULE}`) return undefined;
      const full = buildCatalogue(REPOSITORY_ROOT);
      const taglines = Object.fromEntries(full.explainers.map((e) => [e.slug, e.tagline]));
      return `export default ${JSON.stringify({ ...toWidgetCatalogue(full), taglines })};`;
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
        const file = siteFile(decodeURIComponent(url.slice(SITE_PREFIX.length)));
        if (!file) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader('Content-Type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        createReadStream(file).pipe(res);
      });
    },
  };
}

function inlineBundle(): Plugin {
  return {
    name: 'wmit-widget-inline',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = Object.values(bundle).find(
          (file) => file.type === 'asset' && file.fileName.endsWith('.html'),
        );
        if (!page || page.type !== 'asset') return;
        let html = String(page.source);
        for (const file of Object.values(bundle)) {
          if (file === page) continue;
          const tag = (pattern: RegExp, replacement: string) => {
            html = html.replace(pattern, () => replacement);
          };
          const name = file.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (file.type === 'chunk') {
            const code = file.code.replaceAll('</script', '<\\/script');
            tag(
              new RegExp(`<script type="module"[^>]*src="[^"]*${name}"[^>]*></script>`),
              `<script type="module">${code}</script>`,
            );
          } else if (file.fileName.endsWith('.css')) {
            tag(
              new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${name}"[^>]*>`),
              `<style>${String(file.source)}</style>`,
            );
          } else {
            continue;
          }
          delete bundle[file.fileName];
        }
        page.source = html;
      },
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
  plugins: [catalogue(), devSite(), inlineBundle()],
  build: {
    outDir: resolve(REPOSITORY_ROOT, PATHS.build, 'widget'),
    emptyOutDir: true,
    target: 'es2022',
    modulePreload: false,
    reportCompressedSize: false,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    rolldownOptions: {
      input: resolve(MCP_ROOT, 'widget/explainer.html'),
      output: { codeSplitting: false },
    },
  },
});
