import type { CatalogueChapter, CatalogueEntry } from '../shared/catalogue.ts';

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
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

export function resolveChapter(
  entry: CatalogueEntry,
  query: string | undefined,
): ChapterResolution {
  const chapters = entry.chapters;
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

  const byTitle = chapters.find((c) => c.title.toLowerCase() === lower);
  if (byTitle) return { chapter: byTitle, match: 'title' };

  const wanted = new Set(tokens(q));
  if (wanted.size > 0) {
    let best: CatalogueChapter | undefined;
    let bestScore = 0;
    for (const c of chapters) {
      const have = new Set([...tokens(c.id), ...tokens(c.title)]);
      let score = 0;
      for (const w of wanted) if (have.has(w)) score += 1;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (best) return { chapter: best, match: 'title' };
  }
  return { chapter: first, match: 'fallback' };
}
