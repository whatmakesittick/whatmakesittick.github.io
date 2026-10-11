import { isSlug, SITE_ORIGIN, type WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { EmbedInfo, EmbedState, LanguageCode } from '../../../src/core/embed/contract.ts';
import type { ModelContextSnapshot } from '../../shared/tools.ts';

export interface Target {
  slug: string;
  chapter?: string;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

export function resolveChapter(entry: WidgetCatalogueEntry, raw: unknown): string | undefined {
  if (typeof raw === 'number') raw = String(raw);
  if (typeof raw !== 'string') return undefined;
  const q = raw.trim().toLowerCase();
  if (!q) return undefined;
  const exact = entry.chapters.find((c) => c.id.toLowerCase() === q);
  if (exact) return exact.id;
  if (/^\d+$/.test(q)) return entry.chapters[Number(q) - 1]?.id;
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return undefined;
  let best: { id: string; score: number } | undefined;
  for (const c of entry.chapters) {
    const hay = `${c.id} ${c.title}`.toLowerCase();
    const score = tokens.filter((t) => hay.includes(t)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best?.id;
}

export function targetFromInput(
  args: unknown,
  find: (slug: string) => WidgetCatalogueEntry | undefined,
): Target | undefined {
  if (!isObj(args) || typeof args.slug !== 'string' || !isSlug(args.slug)) return undefined;
  const entry = find(args.slug);
  if (!entry) return undefined;
  const chapter = resolveChapter(entry, args.chapter);
  return chapter ? { slug: args.slug, chapter } : { slug: args.slug };
}

const URL_RE = new RegExp(`${SITE_ORIGIN.replace(/[.]/g, '\\.')}/([a-z0-9-]+)/`);
const CHAPTER_ID_RE = /\(id: ([a-z0-9-]+)\)/i;

export function targetFromResult(
  result: unknown,
  find: (slug: string) => WidgetCatalogueEntry | undefined,
): Target | undefined {
  if (!isObj(result)) return undefined;
  const sc = result.structuredContent;
  if (isObj(sc) && typeof sc.slug === 'string' && find(sc.slug)) {
    return typeof sc.chapter === 'string' && sc.chapter
      ? { slug: sc.slug, chapter: sc.chapter }
      : { slug: sc.slug };
  }
  const content = Array.isArray(result.content) ? result.content : [];
  for (const block of content) {
    if (!isObj(block) || block.type !== 'text' || typeof block.text !== 'string') continue;
    const slug = URL_RE.exec(block.text)?.[1];
    if (!slug || !find(slug)) continue;
    const chapter = CHAPTER_ID_RE.exec(block.text)?.[1];
    return chapter ? { slug, chapter } : { slug };
  }
  return undefined;
}

export function neighbour(
  ids: readonly string[],
  current: string,
  dir: -1 | 1,
): string | undefined {
  const i = ids.indexOf(current);
  if (i < 0) return ids[0];
  return ids[i + dir];
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function shortLabel(label: string): string {
  if (label.length <= 6) return label;
  const head = label.split(/[-–]/)[0]?.trim();
  return head && head.length >= 1 && head.length < label.length ? head : label;
}

export function chapterShort(id: string): string {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function snapshotOf(
  slug: string,
  state: EmbedState | undefined,
  chapter: string,
): ModelContextSnapshot {
  return {
    slug,
    chapter: state?.chapter ?? chapter,
    view: { ...(state?.view ?? {}) },
    choices: { ...(state?.choices ?? {}) },
    playing: state?.playing ?? false,
  };
}

export const sameSnapshot = (
  a: ModelContextSnapshot | undefined,
  b: ModelContextSnapshot,
): boolean => !!a && JSON.stringify(a) === JSON.stringify(b);

const MAX_CHAPTER_TEXT = 2400;

export function modelContextText(
  entry: WidgetCatalogueEntry,
  info: EmbedInfo | undefined,
  snap: ModelContextSnapshot,
  state: EmbedState | undefined,
  lang?: LanguageCode,
): string {
  const scene = info && (!lang || info.language === lang) ? info : undefined;
  const chapters =
    scene?.chapters ??
    entry.chapters.map((c, i) => ({ id: c.id, index: i + 1, title: c.title, paragraphsHtml: [] }));
  const ch = chapters.find((c) => c.id === snap.chapter);
  const parts: string[] = [];
  parts.push(
    ch
      ? `User is now viewing "${entry.title}", chapter ${ch.index}/${chapters.length} "${ch.title}" (id ${ch.id}).`
      : `User is now viewing "${entry.title}".`,
  );
  if (info) {
    const views = info.toggles
      .filter((t) => t.id in snap.view)
      .map((t) => `${t.label.toLowerCase()} ${snap.view[t.id] ? 'on' : 'off'}`);
    if (views.length) parts.push(`Views: ${views.join(', ')}.`);
    for (const c of info.choices) {
      const value = snap.choices[c.id];
      const label = c.options.find((o) => o.value === value)?.label;
      if (label) parts.push(`Choice ${c.label.toLowerCase()}: ${label}.`);
    }
  }
  const phase = state?.phaseLabel ? ` at "${state.phaseLabel}"` : '';
  parts.push(`Playback: ${snap.playing ? 'playing' : 'paused'}${phase}.`);
  if (lang) parts.push(`Language: ${lang}.`);
  let text = parts.join(' ');
  if (ch && ch.paragraphsHtml.length) {
    let body = ch.paragraphsHtml.map(plainText).join(' ');
    if (body.length > MAX_CHAPTER_TEXT)
      body = `${body.slice(0, MAX_CHAPTER_TEXT).replace(/\s+\S*$/, '')}…`;
    text += `\nChapter text: ${body}`;
  }
  return text;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: A | undefined;
  const run = () => {
    timer = undefined;
    if (last) fn(...last);
    last = undefined;
  };
  const call = (...args: A) => {
    last = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
  call.flush = () => {
    if (timer) clearTimeout(timer);
    run();
  };
  call.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    last = undefined;
  };
  return call;
}

export function stripOrder<T extends { slug: string }>(items: readonly T[], first: string): T[] {
  const head = items.filter((i) => i.slug === first);
  return [...head, ...items.filter((i) => i.slug !== first)];
}
