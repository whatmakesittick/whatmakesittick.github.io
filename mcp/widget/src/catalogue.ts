import {
  embedCatalogueFile,
  isSlug,
  type Tag,
  type WidgetCatalogue,
  type WidgetCatalogueEntry,
} from '../../shared/catalogue.ts';
import type { LanguageCode } from '../../../src/core/i18n/languages.ts';
import { freshQuery } from './scene.ts';

export const CATALOGUE_REFRESH_MS = 5 * 60_000;

export const EMPTY_CATALOGUE: WidgetCatalogue = { explainers: [], taglines: {} };

export type ImportModule = (url: string) => Promise<unknown>;

export interface Catalogues {
  ready(lang: LanguageCode): WidgetCatalogue | undefined;
  load(lang: LanguageCode): Promise<WidgetCatalogue>;
  refresh(lang: LanguageCode): Promise<WidgetCatalogue | undefined>;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const isString = (v: unknown): v is string => typeof v === 'string';

function entryOf(value: unknown): WidgetCatalogueEntry | undefined {
  if (!isObj(value) || !isString(value.slug) || !isSlug(value.slug)) return undefined;
  if (!isString(value.title) || !Array.isArray(value.chapters)) return undefined;
  const chapters = value.chapters
    .filter((c): c is Obj => isObj(c) && isString(c.id) && isString(c.title))
    .map((c) => ({ id: c.id as string, title: c.title as string }));
  return {
    slug: value.slug,
    title: value.title,
    eyebrow: text(value.eyebrow),
    summary: text(value.summary),
    tags: (Array.isArray(value.tags) ? value.tags.filter(isString) : []) as Tag[],
    cover: text(value.cover),
    chapters,
  };
}

export function catalogueOf(module: unknown): WidgetCatalogue | undefined {
  const value = isObj(module) ? module.default : undefined;
  if (!isObj(value) || !Array.isArray(value.explainers)) return undefined;
  const explainers = value.explainers
    .map(entryOf)
    .filter((e): e is WidgetCatalogueEntry => e !== undefined);
  if (explainers.length === 0) return undefined;
  const taglines = isObj(value.taglines)
    ? Object.fromEntries(
        Object.entries(value.taglines).filter((pair): pair is [string, string] =>
          isString(pair[1]),
        ),
      )
    : {};
  return { explainers, taglines };
}

const importUrl: ImportModule = (url) => import(/* @vite-ignore */ url);

export function createCatalogues(
  assetBase: string,
  importModule: ImportModule = importUrl,
  now: () => number = Date.now,
): Catalogues {
  const loaded = new Map<LanguageCode, { catalogue: WidgetCatalogue; at: number }>();
  const pending = new Map<LanguageCode, Promise<WidgetCatalogue>>();

  const fetchCatalogue = async (lang: LanguageCode, query: string) => {
    const url = `${assetBase}${embedCatalogueFile(lang)}${query}`;
    const catalogue = catalogueOf(await importModule(url));
    if (!catalogue) throw new Error(`${url} has no catalogue`);
    return catalogue;
  };

  const first = (lang: LanguageCode) =>
    fetchCatalogue(lang, '')
      .then((catalogue) => ({ catalogue, at: -Infinity }))
      .catch((error: unknown) => {
        console.warn('[wmit-widget] catalogue failed, loading a fresh module', error);
        const at = now();
        return fetchCatalogue(lang, freshQuery(now)).then((catalogue) => ({ catalogue, at }));
      });

  return {
    ready: (lang) => loaded.get(lang)?.catalogue,
    load(lang) {
      const done = loaded.get(lang);
      if (done) return Promise.resolve(done.catalogue);
      let promise = pending.get(lang);
      if (!promise) {
        promise = first(lang).then((got) => {
          loaded.set(lang, got);
          return got.catalogue;
        });
        promise.then(
          () => pending.delete(lang),
          () => pending.delete(lang),
        );
        pending.set(lang, promise);
      }
      return promise;
    },
    async refresh(lang) {
      const done = loaded.get(lang);
      const at = now();
      if (!done || at - done.at < CATALOGUE_REFRESH_MS) return undefined;
      loaded.set(lang, { ...done, at });
      try {
        const catalogue = await fetchCatalogue(lang, freshQuery(now));
        if (JSON.stringify(catalogue) === JSON.stringify(done.catalogue)) return undefined;
        loaded.set(lang, { catalogue, at });
        return catalogue;
      } catch (error) {
        console.warn('[wmit-widget] catalogue refresh failed, keeping the last one', error);
        return undefined;
      }
    },
  };
}
