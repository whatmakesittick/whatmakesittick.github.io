import type { EmbedManifest, EmbedManifestEntry } from '../../src/core/embed/manifest.ts';
import { DEFAULT_LANGUAGE, type LanguageCode } from '../../src/core/i18n/languages.ts';
import type { Dictionary } from '../../src/core/i18n/resources.ts';
import type { ExplainerMeta } from '../../src/core/manifest.ts';
import { chapterOutline } from '../../vite/chapterOutline.ts';
import { lookup, publishedEntry } from '../../vite/catalogueEntry.ts';
import { embedSourcePath } from '../../vite/embedPaths.ts';
import {
  LOCALES_DIRECTORY,
  MANIFEST_FILE,
  parseMeta,
  parsePublishedManifest,
  type PublishedManifest,
} from '../../vite/manifestSchema.ts';
import {
  isSlug,
  parseSlugAliases,
  plainText,
  resolveSlug,
  type CatalogueEntry,
} from '../shared/catalogue.ts';
import type { ListExplainersItem } from '../shared/tools.ts';
import { log } from './log.ts';

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
export const SITE_BACKOFF_MS = 30_000;
export const SITE_MAX_BYTES = 4 * 1024 * 1024;
const CHAPTERS_FILE = 'chapters.html';
const FETCH_TIMEOUT_MS = 10_000;
const INDEX_TEXT_FIELDS = ['slug', 'topic', 'title', 'summary'];
const INDEX_LIST_FIELDS = ['tags', 'chapters'];

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '[::1]' || /^127\./.test(hostname);
}

function tooLarge(url: string): Error {
  return new Error(`${url}: too large, over ${SITE_MAX_BYTES} bytes`);
}

async function boundedText(url: string, res: Response): Promise<string> {
  if (Number(res.headers.get('content-length')) > SITE_MAX_BYTES) throw tooLarge(url);
  if (!res.body) return '';
  const stream = res.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await stream.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > SITE_MAX_BYTES) {
      await stream.cancel();
      throw tooLarge(url);
    }
    text += decoder.decode(value, { stream: true });
  }
}

export function httpReader(assetBase: string, fetchImpl: typeof fetch = fetch): SiteReader {
  const base = new URL(assetBase);
  const local = base.protocol === 'http:' && isLoopback(base.hostname);
  if (base.protocol !== 'https:' && !local)
    throw new Error(`${base.href}: the site is read over https, or http on this machine`);
  return async (path) => {
    const url = new URL(path, base).href;
    const res = await fetchImpl(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) await res.body?.cancel();
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return boundedText(url, res);
  };
}

type Parse<T> = (text: string | undefined) => T;

interface Slot {
  value?: unknown;
  has: boolean;
  at: number;
  failedAt?: number;
  error?: unknown;
  pending?: Promise<unknown>;
}

function cache(read: SiteReader, ttlMs: number, now: () => number) {
  const slots = new Map<string, Slot>();

  function refresh<T>(path: string, parse: Parse<T>, slot: Slot): Promise<T> {
    const pending = read(path)
      .then(parse)
      .then(
        (value) => {
          Object.assign(slot, {
            value,
            has: true,
            at: now(),
            failedAt: undefined,
            pending: undefined,
          });
          return value;
        },
        (error: unknown) => {
          Object.assign(slot, { failedAt: now(), error, pending: undefined });
          throw error;
        },
      );
    slot.pending = pending;
    return pending;
  }

  return function load<T>(path: string, parse: Parse<T>): Promise<T> {
    const slot = slots.get(path) ?? { has: false, at: 0 };
    slots.set(path, slot);
    const waiting = slot.failedAt !== undefined && now() - slot.failedAt < SITE_BACKOFF_MS;
    if (slot.has) {
      if (now() - slot.at >= ttlMs && !slot.pending && !waiting) {
        refresh(path, parse, slot).catch((error: unknown) => log(`refresh ${path}:`, error));
      }
      return Promise.resolve(slot.value as T);
    }
    if (slot.pending) return slot.pending as Promise<T>;
    if (waiting) return Promise.reject(slot.error);
    return refresh(path, parse, slot);
  };
}

function json(path: string, text: string | undefined): unknown {
  if (text === undefined) throw new Error(`${path} not found`);
  try {
    return JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: ${reason}`, { cause: error });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndexEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    INDEX_TEXT_FIELDS.every((key) => typeof value[key] === 'string') &&
    INDEX_LIST_FIELDS.every((key) => Array.isArray(value[key]))
  );
}

function parseIndex(text: string | undefined): EmbedManifest {
  const value = json(SITE_INDEX_FILE, text);
  const explainers = isRecord(value) ? value.explainers : undefined;
  if (!Array.isArray(explainers) || explainers.length === 0 || !explainers.every(isIndexEntry))
    throw new Error(`${SITE_INDEX_FILE}: not a list of explainers`);
  const aliases = parseSlugAliases(isRecord(value) ? value.aliases : undefined);
  return { ...(value as unknown as EmbedManifest), aliases };
}

interface Locale {
  dictionary: Dictionary;
  meta: ExplainerMeta;
}

function localePath(slug: string, code: LanguageCode): string {
  return embedSourcePath(slug, `${LOCALES_DIRECTORY}/${code}.json`);
}

function chapterTitle(dictionary: Dictionary | undefined, id: string): string | undefined {
  const title = lookup(dictionary, `sections.${id}.title`);
  return title?.trim() ? plainText(title) : undefined;
}

export function createSite(read: SiteReader, options: SiteOptions = {}): Site {
  const load = cache(read, options.ttlMs ?? SITE_TTL_MS, options.now ?? Date.now);

  function index(): Promise<EmbedManifest> {
    return load(SITE_INDEX_FILE, parseIndex);
  }

  async function listed(slug: string): Promise<EmbedManifestEntry | undefined> {
    const { explainers, aliases } = await index();
    const current = resolveSlug(slug, aliases);
    return explainers.find((e) => e.slug === current);
  }

  function manifest(slug: string): Promise<PublishedManifest> {
    const path = embedSourcePath(slug, MANIFEST_FILE);
    return load(path, (text) => parsePublishedManifest(json(path, text), slug));
  }

  function chapters(slug: string): Promise<string> {
    const path = embedSourcePath(slug, CHAPTERS_FILE);
    return load(path, (text) => {
      if (text === undefined) throw new Error(`${path} not found`);
      if (chapterOutline(text).length === 0) throw new Error(`${path}: no chapters`);
      return text;
    });
  }

  function locale(slug: string, code: LanguageCode): Promise<Locale | undefined> {
    const path = localePath(slug, code);
    return load(path, (text) => {
      if (text === undefined) return undefined;
      const dictionary = json(path, text) as Dictionary;
      return { dictionary, meta: parseMeta(dictionary, slug, code) };
    });
  }

  async function requiredLocale(slug: string, code: LanguageCode): Promise<Locale> {
    const found = await locale(slug, code);
    if (!found) throw new Error(`${localePath(slug, code)} not found`);
    return found;
  }

  async function translation(slug: string, code: LanguageCode): Promise<Locale | undefined> {
    try {
      return await locale(slug, code);
    } catch (error) {
      log(`${localePath(slug, code)} unavailable, English instead:`, error);
      return undefined;
    }
  }

  async function entry(requested: string, lang: LanguageCode): Promise<CatalogueEntry | undefined> {
    const indexed = await listed(requested);
    if (!indexed) return undefined;
    const { slug } = indexed;
    const published = await manifest(slug);
    const asked = lang !== DEFAULT_LANGUAGE && published.locales.includes(lang);
    const [html, english, translated] = await Promise.all([
      chapters(slug),
      requiredLocale(slug, DEFAULT_LANGUAGE),
      asked ? translation(slug, lang) : undefined,
    ]);
    const byCode = new Map([[DEFAULT_LANGUAGE, english]]);
    if (translated) byCode.set(lang, translated);
    const pick = <K extends keyof Locale>(key: K) =>
      Object.fromEntries([...byCode].map(([code, found]) => [code, found[key]]));
    return publishedEntry(
      {
        manifest: published,
        meta: english.meta,
        metas: pick('meta'),
        dictionaries: pick('dictionary'),
        chapters: html,
      },
      indexed.cover,
    );
  }

  async function summary(
    requested: string,
    lang: LanguageCode,
  ): Promise<ListExplainersItem | undefined> {
    const english = await listed(requested);
    if (!english) return undefined;
    const { slug } = english;
    const found = lang === DEFAULT_LANGUAGE ? undefined : await translation(slug, lang);
    return {
      slug,
      title: found?.meta.title || english.title,
      summary: found?.meta.summary || english.summary,
      tags: english.tags.filter(isSlug),
      chapters: english.chapters.map(({ id, title }) => ({
        id,
        title: chapterTitle(found?.dictionary, id) || title,
      })),
    };
  }

  return { index, entry, summary };
}
