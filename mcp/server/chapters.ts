import { DEFAULT_LANGUAGE, type LanguageCode } from '../../src/core/i18n/languages.ts';
import { localizeEntry, type CatalogueChapter, type CatalogueEntry } from '../shared/catalogue.ts';

export type ChapterMatch = 'default' | 'id' | 'number' | 'title' | 'fallback';

export interface ChapterResolution {
  chapter: CatalogueChapter;
  match: ChapterMatch;
}

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'and',
  'or',
  'to',
  'in',
  'on',
  'for',
  'at',
  'it',
  'its',
  'is',
  'how',
  'what',
  'chapter',
  'part',
  'section',
  'step',
  'no',
  'number',
]);

export function tokens(text: string): string[] {
  return (
    text
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
    .filter((t) => !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

const squash = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

export function resolveChapter(
  entry: CatalogueEntry,
  query: string | undefined,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): ChapterResolution {
  const chapters = localizeEntry(entry, lang).chapters;
  const first = chapters[0];
  if (!first) throw new Error(`${entry.slug}: catalogue entry has no chapters`);
  const q = (query ?? '').trim();
  if (!q) return { chapter: first, match: 'default' };

  const lower = q.toLowerCase();
  const byId = chapters.find((c) => c.id.toLowerCase() === lower);
  if (byId) return { chapter: byId, match: 'id' };

  const num = /^(?:(?:chapter|part|section|#)\s*)?(\d+)$/i.exec(q);
  if (num) {
    const byIndex = chapters.find((c) => c.index === Number(num[1]));
    if (byIndex) return { chapter: byIndex, match: 'number' };
    return { chapter: first, match: 'fallback' };
  }

  const titles = chapters.map((c, i) => [c.title, entry.chapters[i]?.title ?? c.title]);
  const wantedTitle = squash(q);
  const exact = chapters.findIndex((_, i) => titles[i]!.some((t) => squash(t) === wantedTitle));
  if (wantedTitle && exact >= 0) return { chapter: chapters[exact]!, match: 'title' };

  if (UNSPACED.test(q) && wantedTitle) {
    const inside = chapters.findIndex((_, i) =>
      titles[i]!.some((t) => {
        const title = squash(t);
        return title.includes(wantedTitle) || (title.length > 1 && wantedTitle.includes(title));
      }),
    );
    if (inside >= 0) return { chapter: chapters[inside]!, match: 'title' };
  }

  const wanted = new Set(tokens(q));
  if (wanted.size > 0) {
    let best: CatalogueChapter | undefined;
    let bestScore = 0;
    chapters.forEach((c, i) => {
      const have = new Set([c.id, ...titles[i]!].flatMap(tokens));
      let score = 0;
      for (const w of wanted) if (have.has(w)) score += 1;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    });
    if (best) return { chapter: best, match: 'title' };
  }
  return { chapter: first, match: 'fallback' };
}
