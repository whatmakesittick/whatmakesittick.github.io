import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LANGUAGE, isLanguageCode } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { CATEGORIES, META_KEYS } from '../src/core/manifest.ts';
import type { Category, ExplainerManifest, ExplainerMeta } from '../src/core/manifest.ts';

export const EXPLAINERS_DIRECTORY = 'explainers';
export const MANIFEST_FILE = 'explainer.json';
export const PUBLIC_DIRECTORY = 'public';
export const LOCALES_DIRECTORY = 'locales';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  'assets',
  'dist',
  'explainers',
  'icons',
  'node_modules',
  'public',
  'scripts',
  'src',
  'vite',
]);

export interface LoadedExplainer {
  manifest: ExplainerManifest;
  directory: string;
  meta: ExplainerMeta;
  metas: Partial<Record<LanguageCode, ExplainerMeta>>;
  chapters: string;
}

type Fields = Record<string, unknown>;

function fail(folder: string, message: string): never {
  throw new Error(`${EXPLAINERS_DIRECTORY}/${folder}/${MANIFEST_FILE}: ${message}`);
}

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(fields: Fields, key: string, folder: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.trim() === '') fail(folder, `"${key}" must be a string`);
  return value;
}

function readSlug(fields: Fields, folder: string): string {
  const slug = readString(fields, 'slug', folder);
  if (slug !== folder) fail(folder, `"slug" must match the folder name "${folder}"`);
  if (!SLUG_PATTERN.test(slug)) fail(folder, `"slug" must be lowercase words joined by dashes`);
  if (RESERVED_SLUGS.has(slug)) fail(folder, `"slug" "${slug}" is reserved`);
  return slug;
}

function readCategory(fields: Fields, folder: string): Category {
  const category = readString(fields, 'category', folder);
  const match = CATEGORIES.find((candidate) => candidate === category);
  if (!match) fail(folder, `"category" must be one of ${CATEGORIES.join(', ')}`);
  return match;
}

function readLocales(fields: Fields, folder: string): LanguageCode[] {
  const locales = fields.locales;
  if (!Array.isArray(locales)) fail(folder, '"locales" must be a list of language codes');
  const codes = locales.filter((code): code is LanguageCode => isLanguageCode(String(code)));
  if (codes.length !== locales.length) fail(folder, '"locales" has an unknown language code');
  if (!codes.includes(DEFAULT_LANGUAGE))
    fail(folder, `"locales" must include "${DEFAULT_LANGUAGE}"`);
  return codes;
}

function readSocial(fields: Fields, folder: string): ExplainerManifest['social'] {
  const social = fields.social;
  if (!isFields(social)) fail(folder, '"social" must name an image and its alt text');
  return { image: readString(social, 'image', folder), alt: readString(social, 'alt', folder) };
}

export function parseManifest(value: unknown, folder: string): ExplainerManifest {
  if (!isFields(value)) fail(folder, 'must be a JSON object');
  return {
    slug: readSlug(value, folder),
    category: readCategory(value, folder),
    cover: readString(value, 'cover', folder),
    entry: readString(value, 'entry', folder),
    chapters: readString(value, 'chapters', folder),
    locales: readLocales(value, folder),
    social: readSocial(value, folder),
  };
}

export function parseMeta(value: unknown, folder: string, code: LanguageCode): ExplainerMeta {
  const meta = isFields(value) ? value.meta : undefined;
  if (!isFields(meta)) fail(folder, `${LOCALES_DIRECTORY}/${code}.json needs a "meta" block`);
  const entries = META_KEYS.map((key) => [key, readString(meta, key, folder)]);
  return Object.fromEntries(entries) as ExplainerMeta;
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
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

function loadExplainer(root: string, folder: string): LoadedExplainer {
  const directory = join(root, EXPLAINERS_DIRECTORY, folder);
  const manifest = parseManifest(readJson(join(directory, MANIFEST_FILE)), folder);
  const missing = requiredFiles(manifest, directory).find((file) => !existsSync(file));
  if (missing) fail(folder, `missing file ${missing}`);
  const metas = Object.fromEntries(
    manifest.locales.map((code) => [
      code,
      parseMeta(readJson(localeFile(directory, code)), folder, code),
    ]),
  ) as Record<LanguageCode, ExplainerMeta>;
  return {
    manifest,
    directory,
    meta: metas[DEFAULT_LANGUAGE],
    metas,
    chapters: readFileSync(join(directory, manifest.chapters), 'utf8'),
  };
}

export function loadExplainers(root: string): LoadedExplainer[] {
  const explainersDirectory = join(root, EXPLAINERS_DIRECTORY);
  if (!existsSync(explainersDirectory)) return [];
  return readdirSync(explainersDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(explainersDirectory, entry.name, MANIFEST_FILE)))
    .map((entry) => loadExplainer(root, entry.name))
    .sort((a, b) => a.manifest.slug.localeCompare(b.manifest.slug));
}
