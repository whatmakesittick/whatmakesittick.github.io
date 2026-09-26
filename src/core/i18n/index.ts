import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ja from '../locales/ja.json';
import pt from '../locales/pt.json';
import uk from '../locales/uk.json';
import zh from '../locales/zh.json';
import { DEFAULT_LANGUAGE, LANGUAGES, isLanguageCode } from './languages';
import type { LanguageCode } from './languages';
import { mergeBundles } from './resources';
import type { LocaleBundle } from './resources';

export { DEFAULT_LANGUAGE, LANGUAGES } from './languages';
export type { Language, LanguageCode } from './languages';
export type { Dictionary, LocaleBundle } from './resources';

export const CORE_LOCALES: LocaleBundle = { en, zh, es, uk, pt, fr, de, ja };

const STORAGE_KEY = 'language';
export const LANGUAGE_QUERY_KEY = 'lang';

export async function initI18n(locales: LocaleBundle = {}): Promise<void> {
  const resources = mergeBundles(CORE_LOCALES, locales);
  await i18next.use(LanguageDetector).init({
    resources: Object.fromEntries(
      Object.entries(resources).map(([code, translation]) => [code, { translation }]),
    ),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES.map((language) => language.code),
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: LANGUAGE_QUERY_KEY,
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });
}

export const t = i18next.t.bind(i18next);

export function currentLanguage(): LanguageCode {
  const [base] = (i18next.language ?? DEFAULT_LANGUAGE).split('-');
  return isLanguageCode(base) ? base : DEFAULT_LANGUAGE;
}

export function setLanguage(code: LanguageCode): Promise<unknown> {
  return i18next.changeLanguage(code);
}

export function onLanguageChanged(listener: (code: LanguageCode) => void): () => void {
  const handler = () => listener(currentLanguage());
  i18next.on('languageChanged', handler);
  return () => i18next.off('languageChanged', handler);
}
