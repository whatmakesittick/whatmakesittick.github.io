import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { Dictionary } from '../src/core/i18n/resources.ts';
import { ABOUT_PAGE } from '../src/core/pages.ts';
import type { ExplainerManifest, ExplainerMeta } from '../src/core/manifest.ts';
import { readPageDates } from './dates.ts';
import type { PageDates } from './dates.ts';
import {
  checkFormerSlugs,
  EXPLAINERS_DIRECTORY,
  LOCALES_DIRECTORY,
  MANIFEST_FILE,
  parseManifest,
  parseMeta,
} from './manifestSchema.ts';

export { EXPLAINERS_DIRECTORY, LOCALES_DIRECTORY, MANIFEST_FILE, parseManifest, parseMeta };

export const PUBLIC_DIRECTORY = 'public';

const PROJECT_FOLDERS = [
  ABOUT_PAGE,
  'assets',
  'dist',
  'embed',
  'explainers',
  'mcp',
  'node_modules',
  'public',
  'scripts',
  'src',
  'vite',
];

export interface LoadedExplainer {
  manifest: ExplainerManifest;
  directory: string;
  meta: ExplainerMeta;
  metas: Partial<Record<LanguageCode, ExplainerMeta>>;
  dictionaries: Partial<Record<LanguageCode, Dictionary>>;
  chapters: string;
  dates: PageDates;
}

export function reservedSlugs(root: string): ReadonlySet<string> {
  const publicDirectory = join(root, PUBLIC_DIRECTORY);
  const published = existsSync(publicDirectory) ? readdirSync(publicDirectory) : [];
  const languages = LANGUAGES.map((language) => language.code);
  return new Set([...PROJECT_FOLDERS, ...languages, ...published]);
}

export function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${file}: ${reason}`, { cause: error });
  }
}

export function localeFile(directory: string, code: LanguageCode): string {
  return join(directory, LOCALES_DIRECTORY, `${code}.json`);
}

function requiredFiles(manifest: ExplainerManifest, directory: string): string[] {
  const publicDirectory = join(directory, PUBLIC_DIRECTORY);
  return [
    join(directory, manifest.entry),
    join(directory, manifest.chapters),
    join(publicDirectory, manifest.cover),
    join(publicDirectory, manifest.social.image),
    ...manifest.locales.map((code) => localeFile(directory, code)),
  ];
}

function loadExplainer(
  root: string,
  folder: string,
  reserved: ReadonlySet<string>,
): LoadedExplainer {
  const directory = join(root, EXPLAINERS_DIRECTORY, folder);
  const manifest = parseManifest(readJson(join(directory, MANIFEST_FILE)), folder, reserved);
  const missing = requiredFiles(manifest, directory).find((file) => !existsSync(file));
  if (missing)
    throw new Error(`${EXPLAINERS_DIRECTORY}/${folder}/${MANIFEST_FILE}: missing file ${missing}`);
  const dictionaries = Object.fromEntries(
    manifest.locales.map((code) => [code, readJson(localeFile(directory, code))]),
  ) as Record<LanguageCode, Dictionary>;
  const metas = Object.fromEntries(
    manifest.locales.map((code) => [code, parseMeta(dictionaries[code], folder, code)]),
  ) as Record<LanguageCode, ExplainerMeta>;
  return {
    manifest,
    directory,
    meta: metas[DEFAULT_LANGUAGE],
    metas,
    dictionaries,
    chapters: readFileSync(join(directory, manifest.chapters), 'utf8'),
    dates: readPageDates(directory),
  };
}

export function loadExplainers(root: string): LoadedExplainer[] {
  const explainersDirectory = join(root, EXPLAINERS_DIRECTORY);
  if (!existsSync(explainersDirectory)) return [];
  const reserved = reservedSlugs(root);
  const explainers = readdirSync(explainersDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(explainersDirectory, entry.name, MANIFEST_FILE)))
    .map((entry) => loadExplainer(root, entry.name, reserved))
    .sort((a, b) => a.manifest.slug.localeCompare(b.manifest.slug));
  checkFormerSlugs(explainers.map(({ manifest }) => manifest));
  return explainers;
}
