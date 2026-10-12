import { ATTRIBUTION } from '../shared/config.ts';
import {
  plainText,
  type CatalogueChapter,
  type LocalizedCatalogueEntry,
} from '../shared/catalogue.ts';
import { MODEL_TEXT_MAX_BYTES, type ListExplainersItem } from '../shared/tools.ts';
import type { ChapterResolution } from './chapters.ts';

const encoder = new TextEncoder();
export const byteLength = (s: string): number => encoder.encode(s).length;

export function truncateBytes(text: string, maxBytes: number): string {
  if (byteLength(text) <= maxBytes) return text;
  const ellipsis = '…';
  const budget = maxBytes - byteLength(ellipsis);
  if (budget <= 0) return '';
  let out = '';
  let used = 0;
  for (const ch of text) {
    const n = byteLength(ch);
    if (used + n > budget) break;
    out += ch;
    used += n;
  }
  const space = out.lastIndexOf(' ');
  if (space > out.length * 0.6) out = out.slice(0, space);
  return out.replace(/[\s,.;:]+$/, '') + ellipsis;
}

const chapterText = (c: CatalogueChapter): string =>
  c.paragraphs.map((p) => plainText(p.html)).join(' ');

const SNIPPET_CHARS = 160;
const snippet = (c: CatalogueChapter): string => {
  const first = c.paragraphs[0];
  const p1 = first ? plainText(first.html) : '';
  return p1.length <= SNIPPET_CHARS ? p1 : `${p1.slice(0, SNIPPET_CHARS).replace(/\s+\S*$/, '')}…`;
};

export function showExplainerText(
  entry: LocalizedCatalogueEntry,
  res: ChapterResolution,
  requested?: string,
): string {
  const { chapter } = res;
  const n = entry.chapters.length;
  const head: string[] = [
    `Showing the interactive 3D explainer "${entry.title}" (${ATTRIBUTION}).`,
  ];
  if (res.match === 'fallback') {
    head.push(`No chapter matches "${requested ?? ''}", so it opened at the first chapter.`);
  }
  head.push(`Opened at chapter ${chapter.index} of ${n}: "${chapter.title}" (id: ${chapter.id}).`);
  head.push(entry.tagline);

  const others = entry.chapters.map((c) =>
    c.id === chapter.id
      ? `${c.index} ${c.id} "${c.title}" (open now)`
      : `${c.index} ${c.id} "${c.title}": ${snippet(c)}`,
  );
  const tail = [
    "The user can rotate and zoom the model, play the cycle, toggle views and switch chapters or other explainers in the widget. Answer follow-ups from this text; don't paste it back verbatim.",
    `Website: ${entry.url}`,
  ];

  const assemble = (current: string, chapterLines: string[]): string =>
    [...head, `Current chapter text: ${current}`, 'Chapters:', ...chapterLines, ...tail].join('\n');

  const fixed = byteLength(assemble('', others));
  let text = assemble(truncateBytes(chapterText(chapter), MODEL_TEXT_MAX_BYTES - fixed), others);
  if (byteLength(text) > MODEL_TEXT_MAX_BYTES || MODEL_TEXT_MAX_BYTES - fixed < 600) {
    const titlesOnly = entry.chapters.map(
      (c) => `${c.index} ${c.id} "${c.title}"${c.id === chapter.id ? ' (open now)' : ''}`,
    );
    const fixed2 = byteLength(assemble('', titlesOnly));
    text = assemble(truncateBytes(chapterText(chapter), MODEL_TEXT_MAX_BYTES - fixed2), titlesOnly);
  }
  return truncateBytes(text, MODEL_TEXT_MAX_BYTES);
}

export function listExplainersText(entries: readonly ListExplainersItem[], tag?: string): string {
  if (entries.length === 0) {
    return tag ? `No explainers with the tag "${tag}".` : 'No explainers available.';
  }
  const lines = entries.map(
    (e) =>
      `${e.slug} | ${e.title} | ${e.summary} | chapters: ${e.chapters.map((c) => c.id).join(', ')}`,
  );
  const head = tag
    ? `${entries.length} explainer(s) tagged "${tag}" (${ATTRIBUTION}):`
    : `${entries.length} explainer(s) from What makes it tick (${ATTRIBUTION}):`;
  return [head, ...lines, 'Open one with show_explainer({slug, chapter?}).'].join('\n');
}
