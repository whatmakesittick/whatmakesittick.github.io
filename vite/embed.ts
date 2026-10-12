import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_LANGUAGE } from '../src/core/i18n/languages.ts';
import { EMBED_API_VERSION } from '../src/core/embed/manifest.ts';
import type { EmbedManifest, EmbedManifestEntry } from '../src/core/embed/manifest.ts';
import type { CatalogueEntry } from './catalogueModel.ts';
import { chapterOutline } from './chapterOutline.ts';
import { LOCALES_DIRECTORY, MANIFEST_FILE, PUBLIC_DIRECTORY } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';
import { localeLoader } from './page.ts';
import { EMBED_DIRECTORY, embedSourcePath } from './embedPaths.ts';

export { EMBED_DIRECTORY, embedSourcePath };

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
  const localesRoot = posix(join(directory, LOCALES_DIRECTORY));
  const styles = existsSync(style)
    ? `import styles from '${posix(style)}?inline';`
    : "const styles = '';";
  return [
    `import { defineEmbed } from '${EMBED_MOUNT_MODULE}';`,
    `import explainer from '${posix(entry)}';`,
    `import ${DEFAULT_LANGUAGE} from '${localesRoot}/${DEFAULT_LANGUAGE}.json';`,
    styles,
    '',
    `export const apiVersion = ${EMBED_API_VERSION};`,
    `export const slug = ${JSON.stringify(manifest.slug)};`,
    `const chapters = ${JSON.stringify(chapterOutline(chapters))};`,
    'const locales = {',
    ...manifest.locales.map((code) => localeLoader(localesRoot, code)),
    '};',
    'export const mount = defineEmbed(explainer, { slug, locales, chapters, styles });',
    '',
  ].join('\n');
}

function manifestEntry(entry: CatalogueEntry): EmbedManifestEntry {
  const { slug, cover, title, eyebrow, summary, tagline, tags, topic, chapters } = entry;
  return {
    slug,
    module: embedModuleFile(slug),
    cover,
    title,
    eyebrow,
    summary,
    tagline,
    tags,
    topic,
    chapters: chapters.map(({ id, title: chapterTitle }) => ({ id, title: chapterTitle })),
  };
}

export function embedManifest(entries: readonly CatalogueEntry[]): EmbedManifest {
  return { apiVersion: EMBED_API_VERSION, explainers: entries.map(manifestEntry) };
}

export interface EmbedFile {
  fileName: string;
  source: string;
}

export function legacyEmbedFiles(
  explainers: readonly LoadedExplainer[],
  resolveModule: (specifier: string) => string,
): EmbedFile[] {
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

export function embedSourceFiles(explainers: readonly LoadedExplainer[]): EmbedFile[] {
  return explainers.flatMap(({ manifest, directory }) => {
    const locales = manifest.locales.map((code) => `${LOCALES_DIRECTORY}/${code}.json`);
    const files = [
      { name: MANIFEST_FILE, file: MANIFEST_FILE },
      { name: 'chapters.html', file: manifest.chapters },
      ...locales.map((file) => ({ name: file, file })),
    ];
    return files.map(({ name, file }) => ({
      fileName: `${EMBED_DIRECTORY}/${embedSourcePath(manifest.slug, name)}`,
      source: join(directory, file),
    }));
  });
}
