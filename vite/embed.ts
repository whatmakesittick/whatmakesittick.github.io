import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import { EMBED_API_VERSION } from '../src/core/embed/manifest.ts';
import type { EmbedManifest, EmbedManifestEntry } from '../src/core/embed/manifest.ts';
import type { Dictionary } from '../src/core/i18n/resources.ts';
import { chapterOutline } from './chapterOutline.ts';
import { LOCALES_DIRECTORY, PUBLIC_DIRECTORY } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';

export const EMBED_DIRECTORY = 'embed/v1';
export const EMBED_MANIFEST_FILE = `${EMBED_DIRECTORY}/manifest.json`;
export const EMBED_MOUNT_MODULE = '@core/embed/mount';

export const LEGACY_FONTS = [
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
  '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
] as const;

const ENTRY_PREFIX = 'virtual:embed/';
const RESOLVED_PREFIX = `\0${ENTRY_PREFIX}`;
const STYLE_FILE = 'style.css';
const DEFAULT_ENTRY_FILE_NAMES = 'assets/[name]-[hash].js';

function posix(path: string): string {
  return path.replaceAll('\\', '/');
}

export function embedModuleFile(slug: string): string {
  return `${slug}.js`;
}

export function embedInputs(explainers: readonly LoadedExplainer[]): Record<string, string> {
  return Object.fromEntries(
    explainers.map(({ manifest }) => [
      `${EMBED_DIRECTORY}/${manifest.slug}`,
      `${ENTRY_PREFIX}${manifest.slug}`,
    ]),
  );
}

export function entryFileNames(chunk: { name: string }): string {
  return chunk.name.startsWith(`${EMBED_DIRECTORY}/`) ? '[name].js' : DEFAULT_ENTRY_FILE_NAMES;
}

export function resolveEmbedEntry(id: string): string | undefined {
  return id.startsWith(ENTRY_PREFIX) ? `\0${id}` : undefined;
}

export function embedEntrySlug(id: string): string | undefined {
  return id.startsWith(RESOLVED_PREFIX) ? id.slice(RESOLVED_PREFIX.length) : undefined;
}

export function renderEmbedEntry({ manifest, directory, chapters }: LoadedExplainer): string {
  const entry = join(directory, manifest.entry);
  const style = join(dirname(entry), STYLE_FILE);
  const locale = join(directory, LOCALES_DIRECTORY, `${DEFAULT_LANGUAGE}.json`);
  const styles = existsSync(style)
    ? `import styles from '${posix(style)}?inline';`
    : "const styles = '';";
  return [
    `import { defineEmbed } from '${EMBED_MOUNT_MODULE}';`,
    `import explainer from '${posix(entry)}';`,
    `import dictionary from '${posix(locale)}';`,
    styles,
    '',
    `export const apiVersion = ${EMBED_API_VERSION};`,
    `export const slug = ${JSON.stringify(manifest.slug)};`,
    `const chapters = ${JSON.stringify(chapterOutline(chapters))};`,
    'export const mount = defineEmbed(explainer, { slug, dictionary, chapters, styles });',
    '',
  ].join('\n');
}

function lookup(dictionary: Dictionary | undefined, key: string): string {
  let node: string | Dictionary | undefined = dictionary;
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  return typeof node === 'string' ? node : key;
}

function manifestEntry(explainer: LoadedExplainer): EmbedManifestEntry {
  const { manifest, meta, chapters, dictionaries } = explainer;
  const english = dictionaries[DEFAULT_LANGUAGE];
  return {
    slug: manifest.slug,
    module: embedModuleFile(manifest.slug),
    cover: `../../${manifest.slug}/${posix(manifest.cover)}`,
    title: meta.title,
    eyebrow: meta.eyebrow,
    summary: meta.summary,
    tagline: meta.tagline,
    tags: manifest.tags,
    chapters: chapterOutline(chapters).map(({ id }) => ({
      id,
      title: lookup(english, `sections.${id}.title`),
    })),
  };
}

export function embedManifest(explainers: readonly LoadedExplainer[]): EmbedManifest {
  return { apiVersion: EMBED_API_VERSION, explainers: explainers.map(manifestEntry) };
}

export interface LegacyEmbedFile {
  fileName: string;
  source: string;
}

export function legacyEmbedFiles(
  explainers: readonly LoadedExplainer[],
  resolveModule: (specifier: string) => string,
): LegacyEmbedFile[] {
  const covers = explainers.map(({ manifest, directory }) => ({
    fileName: `${EMBED_DIRECTORY}/covers/${manifest.slug}.webp`,
    source: join(directory, PUBLIC_DIRECTORY, manifest.cover),
  }));
  const fonts = LEGACY_FONTS.map((specifier) => ({
    fileName: `${EMBED_DIRECTORY}/fonts/${specifier.slice(specifier.lastIndexOf('/') + 1)}`,
    source: resolveModule(specifier),
  }));
  return [...covers, ...fonts];
}
