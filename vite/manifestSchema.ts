import { DEFAULT_LANGUAGE, isLanguageCode } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { META_KEYS, TAGS } from '../src/core/manifest.ts';
import type { ExplainerManifest, ExplainerMeta, Tag } from '../src/core/manifest.ts';

export const EXPLAINERS_DIRECTORY = 'explainers';
export const MANIFEST_FILE = 'explainer.json';
export const LOCALES_DIRECTORY = 'locales';

const SOCIAL_ALT_KEY = 'socialAlt';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function readOptionalString(fields: Fields, key: string, folder: string): string | undefined {
  return fields[key] === undefined ? undefined : readString(fields, key, folder);
}

function readSlug(fields: Fields, folder: string, reserved: ReadonlySet<string>): string {
  const slug = readString(fields, 'slug', folder);
  if (slug !== folder) fail(folder, `"slug" must match the folder name "${folder}"`);
  if (!SLUG_PATTERN.test(slug)) fail(folder, `"slug" must be lowercase words joined by dashes`);
  if (reserved.has(slug)) fail(folder, `"slug" "${slug}" is reserved`);
  return slug;
}

function readFormerSlugs(
  fields: Fields,
  folder: string,
  reserved: ReadonlySet<string>,
): string[] | undefined {
  const former = fields.formerSlugs;
  if (former === undefined) return undefined;
  if (!Array.isArray(former) || former.length === 0)
    fail(folder, '"formerSlugs" must list at least one slug');
  for (const slug of former) {
    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))
      fail(folder, '"formerSlugs" must be lowercase words joined by dashes');
    if (slug === folder) fail(folder, `"formerSlugs" lists the current slug "${slug}"`);
    if (reserved.has(slug)) fail(folder, `"formerSlugs" lists the reserved "${slug}"`);
  }
  const slugs = former as string[];
  const repeated = slugs.find((slug, index) => slugs.indexOf(slug) !== index);
  if (repeated) fail(folder, `"formerSlugs" lists "${repeated}" more than once`);
  return slugs;
}

function isTag(value: unknown): value is Tag {
  return TAGS.some((tag) => tag === value);
}

function readTags(fields: Fields, folder: string): Tag[] {
  const tags = fields.tags;
  if (!Array.isArray(tags) || tags.length === 0) fail(folder, '"tags" must list at least one tag');
  const known = tags.filter(isTag);
  if (known.length !== tags.length) fail(folder, `"tags" must be among ${TAGS.join(', ')}`);
  const repeated = known.find((tag, index) => known.indexOf(tag) !== index);
  if (repeated) fail(folder, `"tags" lists "${repeated}" more than once`);
  return known;
}

function readLocales(fields: Fields, folder: string): LanguageCode[] {
  const locales = fields.locales;
  if (!Array.isArray(locales)) fail(folder, '"locales" must be a list of language codes');
  const codes = locales.filter((code): code is LanguageCode => isLanguageCode(String(code)));
  if (codes.length !== locales.length) fail(folder, '"locales" has an unknown language code');
  const repeated = codes.find((code, index) => codes.indexOf(code) !== index);
  if (repeated) fail(folder, `"locales" lists "${repeated}" more than once`);
  if (!codes.includes(DEFAULT_LANGUAGE))
    fail(folder, `"locales" must include "${DEFAULT_LANGUAGE}"`);
  return codes;
}

function readSocial(fields: Fields, folder: string): ExplainerManifest['social'] {
  const social = fields.social;
  if (!isFields(social)) fail(folder, '"social" must name an image and its alt text');
  return { image: readString(social, 'image', folder), alt: readString(social, 'alt', folder) };
}

export function parseManifest(
  value: unknown,
  folder: string,
  reserved: ReadonlySet<string>,
): ExplainerManifest {
  if (!isFields(value)) fail(folder, 'must be a JSON object');
  const formerSlugs = readFormerSlugs(value, folder, reserved);
  return {
    slug: readSlug(value, folder, reserved),
    tags: readTags(value, folder),
    topic: readString(value, 'topic', folder),
    cover: readString(value, 'cover', folder),
    entry: readString(value, 'entry', folder),
    chapters: readString(value, 'chapters', folder),
    locales: readLocales(value, folder),
    social: readSocial(value, folder),
    ...(formerSlugs ? { formerSlugs } : {}),
  };
}

export function checkFormerSlugs(
  manifests: readonly Pick<ExplainerManifest, 'slug' | 'formerSlugs'>[],
): void {
  const current = new Set(manifests.map(({ slug }) => slug));
  const owners = new Map<string, string>();
  for (const { slug, formerSlugs = [] } of manifests) {
    for (const former of formerSlugs) {
      if (current.has(former))
        fail(slug, `"formerSlugs" lists "${former}", the slug of another explainer`);
      const owner = owners.get(former);
      if (owner) fail(slug, `"formerSlugs" lists "${former}", which ${owner} lists too`);
      owners.set(former, `${EXPLAINERS_DIRECTORY}/${slug}/${MANIFEST_FILE}`);
    }
  }
}

export type PublishedManifest = Pick<ExplainerManifest, 'slug' | 'tags' | 'topic' | 'locales'>;

function known<T>(
  fields: Fields,
  key: string,
  folder: string,
  test: (value: unknown) => value is T,
): T[] {
  const list = fields[key];
  if (!Array.isArray(list)) fail(folder, `"${key}" must be a list`);
  return [...new Set(list.filter(test))];
}

function isKnownLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && isLanguageCode(value);
}

export function parsePublishedManifest(value: unknown, folder: string): PublishedManifest {
  if (!isFields(value)) fail(folder, 'must be a JSON object');
  return {
    slug: readSlug(value, folder, new Set()),
    tags: known(value, 'tags', folder, isTag),
    topic: readString(value, 'topic', folder),
    locales: known(value, 'locales', folder, isKnownLanguage),
  };
}

export function parseMeta(value: unknown, folder: string, code: LanguageCode): ExplainerMeta {
  const meta = isFields(value) ? value.meta : undefined;
  if (!isFields(meta)) fail(folder, `${LOCALES_DIRECTORY}/${code}.json needs a "meta" block`);
  const entries = META_KEYS.map((key) => [key, readString(meta, key, folder)]);
  const required = Object.fromEntries(entries) as ExplainerMeta;
  const socialAlt = readOptionalString(meta, SOCIAL_ALT_KEY, folder);
  return socialAlt === undefined ? required : { ...required, socialAlt };
}
