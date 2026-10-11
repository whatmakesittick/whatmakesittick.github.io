import type { LanguageCode } from '../../../../src/core/i18n/languages.ts';
import uk from './locales/uk.ts';
import de from './locales/de.ts';
import es from './locales/es.ts';
import fr from './locales/fr.ts';
import pt from './locales/pt.ts';
import ja from './locales/ja.ts';
import zh from './locales/zh.ts';
import { ENGLISH, resolveStrings, type Strings, type WidgetStrings } from './strings.ts';

export const STRINGS: { en: Strings } & Record<Exclude<LanguageCode, 'en'>, WidgetStrings> = {
  en: ENGLISH,
  uk,
  de,
  es,
  fr,
  pt,
  ja,
  zh,
};

export function stringsFor(lang: LanguageCode, core?: object): Strings {
  return resolveStrings(lang === 'en' ? undefined : STRINGS[lang], core);
}
