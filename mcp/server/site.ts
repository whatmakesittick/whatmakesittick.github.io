import type { EmbedManifest, EmbedManifestEntry } from '../../src/core/embed/manifest.ts';
import { DEFAULT_LANGUAGE, type LanguageCode } from '../../src/core/i18n/languages.ts';
import type { Dictionary } from '../../src/core/i18n/resources.ts';
import { catalogueEntry, lookup } from '../../vite/catalogueEntry.ts';
import { embedSourcePath } from '../../vite/embedPaths.ts';
import {
  LOCALES_DIRECTORY,
  MANIFEST_FILE,
  parseManifest,
  parseMeta,
} from '../../vite/manifestSchema.ts';
import { isTag, plainText, type CatalogueEntry } from '../shared/catalogue.ts';
import type { ListExplainersItem } from '../shared/tools.ts';

export type SiteReader = (path: string) => Promise<string | undefined>;

export interface Site {
  index(): Promise<EmbedManifest>;
  entry(slug: string, lang: LanguageCode): Promise<CatalogueEntry | undefined>;
  summary(slug: string, lang: LanguageCode): Promise<ListExplainersItem | undefined>;
}

export interface SiteOptions {
  ttlMs?: number;
  now?: () => number;
}

export const SITE_INDEX_FILE = 'manifest.json';
export const SITE_TTL_MS = 300_000;
const CHAPTERS_FILE = 'chapters.html';
const FETCH_TIMEOUT_MS = 10_000;

export function httpReader(assetBase: string, fetchImpl: typeof fetch = fetch): SiteReader {
  return async (path) => {
    const url = new URL(path, assetBase).href;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.text();
  };
}

function cached(read: SiteReader, ttlMs: number, now: () => number): SiteReader {
  const values = new Map<string, { value: string | undefined; at: number }>();
  return async (path) => {
    const hit = values.get(path);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    try {
      const value = await read(path);
      values.set(path, { value, at: now() });
      return value;
    } catch (error) {
      if (hit) return hit.value;
      throw error;
    }
  };
}

function parse(path: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: ${reason}`, { cause: error });
  }
}

function localePath(slug: string, code: LanguageCode): string {
  return embedSourcePath(slug, `${LOCALES_DIRECTORY}/${code}.json`);
}

function chapterTitle(dictionary: Dictionary | undefined, id: string): string | undefined {
  const title = lookup(dictionary, `sections.${id}.title`);
  return title?.trim() ? plainText(title) : undefined;
}

export function createSite(read: SiteReader, options: SiteOptions = {}): Site {
  const get = cached(read, options.ttlMs ?? SITE_TTL_MS, options.now ?? Date.now);

  async function required(path: string): Promise<string> {
    const text = await get(path);
    if (text === undefined) throw new Error(`${path} not found`);
    return text;
  }

  async function json(path: string): Promise<unknown> {
    return parse(path, await required(path));
  }

  async function index(): Promise<EmbedManifest> {
    return (await json(SITE_INDEX_FILE)) as EmbedManifest;
  }

  async function listed(slug: string): Promise<EmbedManifestEntry | undefined> {
    return (await index()).explainers.find((e) => e.slug === slug);
  }

  async function entry(slug: string, lang: LanguageCode): Promise<CatalogueEntry | undefined> {
    if (!(await listed(slug))) return undefined;
    const manifest = parseManifest(
      await json(embedSourcePath(slug, MANIFEST_FILE)),
      slug,
      new Set(),
    );
    const codes =
      lang !== DEFAULT_LANGUAGE && manifest.locales.includes(lang)
        ? [DEFAULT_LANGUAGE, lang]
        : [DEFAULT_LANGUAGE];
    const [chapters, ...dictionaries] = await Promise.all([
      required(embedSourcePath(slug, CHAPTERS_FILE)),
      ...codes.map((code) => json(localePath(slug, code))),
    ]);
    const byCode = new Map(codes.map((code, i) => [code, dictionaries[i] as Dictionary]));
    const metas = new Map(codes.map((code) => [code, parseMeta(byCode.get(code), slug, code)]));
    return catalogueEntry({
      manifest,
      meta: metas.get(DEFAULT_LANGUAGE)!,
      metas: Object.fromEntries(metas),
      dictionaries: Object.fromEntries(byCode),
      chapters,
    });
  }

  async function summary(
    slug: string,
    lang: LanguageCode,
  ): Promise<ListExplainersItem | undefined> {
    const english = await listed(slug);
    if (!english) return undefined;
    const path = localePath(slug, lang);
    const text = lang === DEFAULT_LANGUAGE ? undefined : await get(path);
    const dictionary = text === undefined ? undefined : (parse(path, text) as Dictionary);
    const meta = dictionary ? parseMeta(dictionary, slug, lang) : undefined;
    return {
      slug,
      title: meta?.title || english.title,
      summary: meta?.summary || english.summary,
      tags: english.tags.filter(isTag),
      chapters: english.chapters.map(({ id, title }) => ({
        id,
        title: chapterTitle(dictionary, id) || title,
      })),
    };
  }

  return { index, entry, summary };
}
