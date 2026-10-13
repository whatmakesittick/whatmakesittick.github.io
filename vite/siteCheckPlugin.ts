import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Logger, Plugin } from 'vite';
import { LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { ROBOTS_FILE, SITEMAP_FILE } from './crawl.ts';
import { feedPath } from './site.ts';
import { EMBED_MANIFEST_FILE } from './embed.ts';
import { loadExplainers } from './manifest.ts';
import { isRedirectStub } from './redirects.ts';
import { checkSlugHistory, gitIn, readRemovedSlugs } from './slugHistory.ts';
import { checkSite } from './siteCheck.ts';
import type { BuiltPage, BuiltSite } from './siteCheck.ts';
import { NOT_FOUND_ENTRY, SITE_ENTRY } from './sitePages.ts';

const SCRIPT_DIRECTORIES = ['assets', 'embed'];
const FAVICON_FILE = 'favicon.ico';
const SCRIPT_FILE = /\.js$/;

function listFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

function urlPath(outDir: string, file: string): string {
  return relative(outDir, file).split(sep).join('/');
}

function readPages(outDir: string): BuiltPage[] {
  return listFiles(outDir)
    .filter((file) => file.endsWith(sep + SITE_ENTRY))
    .map((file) => ({
      path: `/${urlPath(outDir, file).slice(0, -SITE_ENTRY.length)}`,
      html: readFileSync(file, 'utf8'),
    }));
}

function readScripts(outDir: string, base: string): Pick<BuiltSite, 'scripts' | 'gzipBytes'> {
  const scripts = new Map<string, string>();
  const gzipBytes = new Map<string, number>();
  const files = SCRIPT_DIRECTORIES.map((directory) => join(outDir, directory))
    .filter((directory) => existsSync(directory))
    .flatMap(listFiles);
  for (const file of files.filter((f) => SCRIPT_FILE.test(f))) {
    const source = readFileSync(file);
    const href = `${base}${urlPath(outDir, file)}`;
    scripts.set(href, source.toString('utf8'));
    gzipBytes.set(href, gzipSync(source).length);
  }
  return { scripts, gzipBytes };
}

function readFeeds(outDir: string): Map<LanguageCode, string> {
  return new Map(
    LANGUAGES.map(({ code }) => [code, join(outDir, feedPath(code))] as const)
      .filter(([, file]) => existsSync(file))
      .map(([code, file]) => [code, readFileSync(file, 'utf8')]),
  );
}

export function readBuiltSite(outDir: string, base: string): BuiltSite {
  const text = (file: string) => readFileSync(join(outDir, file), 'utf8');
  const pages = readPages(outDir);
  return {
    pages: pages.filter((page) => !isRedirectStub(page.html)),
    redirects: pages.filter((page) => isRedirectStub(page.html)),
    ...readScripts(outDir, base),
    sitemap: text(SITEMAP_FILE),
    robots: text(ROBOTS_FILE),
    feeds: readFeeds(outDir),
    notFound: text(NOT_FOUND_ENTRY),
    favicon: readFileSync(join(outDir, FAVICON_FILE)),
    embedManifest: existsSync(join(outDir, EMBED_MANIFEST_FILE))
      ? text(EMBED_MANIFEST_FILE)
      : undefined,
  };
}

export function checkRenames(root: string, logger: Pick<Logger, 'info'>): void {
  const manifests = loadExplainers(root).map(({ manifest }) => manifest);
  const history = checkSlugHistory(gitIn(root), manifests, readRemovedSlugs(root));
  if (history.note) logger.info(`site-check: ${history.note}`);
  if (history.problems.length === 0) return;
  throw new Error(['Explainer slugs went missing:', ...history.problems].join('\n'));
}

export function siteCheck(): Plugin {
  let base = '/';
  let outDir = 'dist';
  let root = process.cwd();
  let logger: Logger | undefined;

  return {
    name: 'site-check',
    apply: 'build',

    configResolved(config) {
      base = config.base;
      root = config.root;
      logger = config.logger;
      outDir = resolve(config.root, config.build.outDir);
    },

    buildStart() {
      if (logger) checkRenames(root, logger);
    },

    closeBundle() {
      const problems = checkSite(readBuiltSite(outDir, base));
      if (problems.length === 0) return;
      throw new Error(['The built site breaks these rules:', ...problems].join('\n'));
    },
  };
}
