import { describe, expect, it } from 'vitest';
import type { ExplainerManifest } from '../manifest';
import { META_KEYS, TAGS, descriptionLimit } from '../manifest';
import { DEFAULT_LANGUAGE, LANGUAGES } from './languages';
import type { Dictionary } from './resources';

const PLACEHOLDER = /\{\{\w+\}\}/g;
const TAG = /<\/?\w+/g;
const LOCALE_PATH = /\/([^/]+)\/locales\/([a-z]+)\.json$/;
const TAG_LABELS_PREFIX = 'catalogue.tags.';

function flatten(dictionary: Dictionary, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(dictionary)) {
    const path = `${prefix}${key}`;
    if (typeof value === 'string') entries.set(path, value);
    else flatten(value, `${path}.`).forEach((text, nested) => entries.set(nested, text));
  }
  return entries;
}

function sortedMatches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0]).sort();
}

function expectSameShape(dictionary: Dictionary, source: Dictionary): void {
  const english = flatten(source);
  const translated = flatten(dictionary);
  expect([...translated.keys()].sort()).toEqual([...english.keys()].sort());
  english.forEach((text, key) => {
    const translation = translated.get(key) ?? '';
    expect(translation.trim(), key).not.toBe('');
    expect(sortedMatches(translation, PLACEHOLDER), key).toEqual(sortedMatches(text, PLACEHOLDER));
    expect(sortedMatches(translation, TAG), key).toEqual(sortedMatches(text, TAG));
  });
}

function byLocale(files: Record<string, Dictionary>): Map<string, Map<string, Dictionary>> {
  const owners = new Map<string, Map<string, Dictionary>>();
  for (const [path, dictionary] of Object.entries(files)) {
    const [, owner, code] = LOCALE_PATH.exec(path) ?? [];
    if (!owners.has(owner)) owners.set(owner, new Map());
    owners.get(owner)?.set(code, dictionary);
  }
  return owners;
}

const coreLocales = byLocale(
  import.meta.glob<Dictionary>('/src/core/locales/*.json', { eager: true, import: 'default' }),
).get('core');
const explainerLocales = byLocale(
  import.meta.glob<Dictionary>('/explainers/*/locales/*.json', { eager: true, import: 'default' }),
);
const manifests = import.meta.glob<ExplainerManifest>('/explainers/*/explainer.json', {
  eager: true,
  import: 'default',
});

describe('core locales', () => {
  it.each(LANGUAGES.map((language) => language.code))(
    '%s tagline fits a search snippet',
    (code) => {
      const tagline = flatten(coreLocales?.get(code) ?? {}).get('catalogue.tagline') ?? '';
      expect(tagline.length, tagline).toBeLessThanOrEqual(descriptionLimit(code));
    },
  );

  const english = coreLocales?.get(DEFAULT_LANGUAGE) ?? {};

  it('labels every tag of the vocabulary and nothing else', () => {
    const labels = [...flatten(english).keys()].filter((key) => key.startsWith(TAG_LABELS_PREFIX));
    expect(labels.sort()).toEqual(TAGS.map((tag) => `${TAG_LABELS_PREFIX}${tag}`).sort());
  });

  it.each(LANGUAGES.map((language) => language.code))('%s matches the English keys', (code) => {
    const dictionary = coreLocales?.get(code);
    expect(dictionary, code).toBeDefined();
    expectSameShape(dictionary ?? {}, english);
  });
});

describe.each(Object.values(manifests).map((manifest) => [manifest.slug, manifest] as const))(
  '%s explainer locales',
  (slug, manifest) => {
    const locales = explainerLocales.get(slug) ?? new Map<string, Dictionary>();
    const english = locales.get(DEFAULT_LANGUAGE) ?? {};

    it('ships exactly the languages its manifest lists', () => {
      expect([...locales.keys()].sort()).toEqual([...manifest.locales].sort());
    });

    it('describes itself for the catalogue and the page head', () => {
      const meta = flatten(english);
      META_KEYS.forEach((key) => expect(meta.get(`meta.${key}`), key).toBeTruthy());
    });

    it.each(manifest.locales.filter((code) => code !== DEFAULT_LANGUAGE))(
      '%s matches the English keys',
      (code) => expectSameShape(locales.get(code) ?? {}, english),
    );

    it.each(manifest.locales)('%s description fits a search snippet', (code) => {
      const description = flatten(locales.get(code) ?? {}).get('meta.description') ?? '';
      expect(description.length, description).toBeLessThanOrEqual(descriptionLimit(code));
    });
  },
);
