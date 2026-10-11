import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import type { EmbedChapterOutline } from '../src/core/embed/manifest.ts';

const CHAPTER = 'section.chapter[data-preset]';
const PARAGRAPH_KEY_ATTRIBUTES = ['data-i18n-html', 'data-i18n'];

function paragraphKey(paragraph: HTMLElement): string | undefined {
  for (const attribute of PARAGRAPH_KEY_ATTRIBUTES) {
    const key = paragraph.getAttribute(attribute);
    if (key) return key;
  }
  return undefined;
}

export function chapterOutline(chaptersHtml: string): EmbedChapterOutline[] {
  return parse(chaptersHtml)
    .querySelectorAll(CHAPTER)
    .map((section) => {
      const id = section.getAttribute('data-preset') ?? '';
      const prefix = `sections.${id}.`;
      const paragraphs = section.children
        .filter((child) => child.tagName === 'P')
        .map(paragraphKey)
        .filter((key): key is string => key?.startsWith(prefix) ?? false);
      return { id, paragraphs };
    });
}
