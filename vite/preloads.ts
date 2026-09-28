import { join } from 'node:path';
import type { Plugin } from 'vite';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import { splitLanguagePath } from '../src/core/i18n/paths.ts';
import { CORE_LOCALES_DIRECTORY } from './i18n.ts';
import { EXPLAINERS_DIRECTORY, localeFile } from './manifest.ts';

export interface EmittedChunk {
  fileName: string;
  facadeModuleId: string | null;
}

const PAGE_FILE = /index\.html$/;
const MODULE_SCRIPT = /^([ \t]*)<script type="module"/m;

function languageModules(root: string, pagePath: string): string[] {
  const { code, page } = splitLanguagePath(pagePath.replace(PAGE_FILE, ''));
  if (!code || code === DEFAULT_LANGUAGE) return [];
  const core = join(root, CORE_LOCALES_DIRECTORY, `${code}.json`);
  return page ? [localeFile(join(root, EXPLAINERS_DIRECTORY, page), code), core] : [core];
}

export function languageChunks(
  root: string,
  pagePath: string,
  chunks: readonly EmittedChunk[],
): string[] {
  return languageModules(root, pagePath).flatMap((id) =>
    chunks.filter(({ facadeModuleId }) => facadeModuleId === id).map(({ fileName }) => fileName),
  );
}

function preloadLink(href: string, indent: string): string {
  return `${indent}<link rel="modulepreload" crossorigin href="${href}">`;
}

export function injectModulePreloads(html: string, hrefs: readonly string[]): string {
  return html.replace(MODULE_SCRIPT, (script, indent: string) =>
    [...hrefs.map((href) => preloadLink(href, indent)), script].join('\n'),
  );
}

export function languagePreloads(): Plugin {
  let root = process.cwd();
  let base = '/';

  return {
    name: 'language-preloads',
    apply: 'build',

    configResolved(config) {
      root = config.root;
      base = config.base;
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, { path, bundle }) {
        if (!bundle) return html;
        const chunks = Object.values(bundle).filter((output) => output.type === 'chunk');
        const files = languageChunks(root, path, chunks);
        return injectModulePreloads(
          html,
          files.map((file) => `${base}${file}`),
        );
      },
    },
  };
}
