import { DEFAULT_LANGUAGE } from '../../src/core/i18n/languages.ts';
import type { LanguageCode } from '../../src/core/i18n/languages.ts';
import type { Catalogue } from '../../vite/catalogueModel.ts';
import { embedCatalogue } from '../../vite/embedCatalogue.ts';
import type { WidgetCatalogue } from '../shared/catalogue.ts';

export function toWidgetCatalogue(
  catalogue: Catalogue,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): WidgetCatalogue {
  return embedCatalogue(catalogue.explainers, lang);
}
