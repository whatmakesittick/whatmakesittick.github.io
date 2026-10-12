import { DEFAULT_LANGUAGE } from '../../src/core/i18n/languages.ts';
import type { LanguageCode } from '../../src/core/i18n/languages.ts';
import type { Catalogue } from '../../vite/catalogueModel.ts';
import { localizeEntry } from '../shared/catalogue.ts';
import type { BakedCatalogue, WidgetCatalogue } from '../shared/catalogue.ts';

export function toWidgetCatalogue(
  catalogue: Catalogue,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): WidgetCatalogue {
  return {
    explainers: catalogue.explainers
      .map((entry) => localizeEntry(entry, lang))
      .map(({ slug, title, eyebrow, summary, tags, cover, chapters }) => ({
        slug,
        title,
        eyebrow,
        summary,
        tags,
        cover,
        chapters: chapters.map(({ id, title: chapterTitle }) => ({ id, title: chapterTitle })),
      })),
  };
}

export function toBakedCatalogue(
  catalogue: Catalogue,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): BakedCatalogue {
  const taglines = Object.fromEntries(
    catalogue.explainers.map((entry) => [entry.slug, localizeEntry(entry, lang).tagline]),
  );
  return { ...toWidgetCatalogue(catalogue, lang), taglines };
}
