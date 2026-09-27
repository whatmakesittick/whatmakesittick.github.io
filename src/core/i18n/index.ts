import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import { NAMESPACE, TRANSLATION_OPTIONS } from './config';
import { DEFAULT_LANGUAGE, LANGUAGES, isLanguageCode } from './languages';
import type { LanguageCode } from './languages';
import { createDictionaryLoader, loadersByLanguage } from './loader';
import type { DictionaryLoader } from './loader';
import type { Dictionary, LocaleLoaders } from './resources';

export { DEFAULT_LANGUAGE, LANGUAGES } from './languages';
export type { Language, LanguageCode } from './languages';
export type { Dictionary, LocaleLoader, LocaleLoaders } from './resources';

const STORAGE_KEY = 'language';
export const LANGUAGE_QUERY_KEY = 'lang';

const CORE_LOCALES: LocaleLoaders = {
  ...loadersByLanguage(
    import.meta.glob<Dictionary>(['../locales/*.json', '!../locales/en.json'], {
      import: 'default',
    }),
  ),
  [DEFAULT_LANGUAGE]: () => Promise.resolve(en),
};

let loadDictionary: DictionaryLoader = createDictionaryLoader([CORE_LOCALES]);
let requestedLanguage: LanguageCode = DEFAULT_LANGUAGE;

async function addLanguage(code: LanguageCode): Promise<void> {
  if (i18next.hasResourceBundle(code, NAMESPACE)) return;
  i18next.addResourceBundle(code, NAMESPACE, await loadDictionary(code));
}

export async function initI18n(locales: LocaleLoaders = {}): Promise<void> {
  loadDictionary = createDictionaryLoader([CORE_LOCALES, locales]);
  const fallback = await loadDictionary(DEFAULT_LANGUAGE);
  await i18next.use(LanguageDetector).init({
    ...TRANSLATION_OPTIONS,
    resources: { [DEFAULT_LANGUAGE]: { [NAMESPACE]: fallback } },
    supportedLngs: LANGUAGES.map((language) => language.code),
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: LANGUAGE_QUERY_KEY,
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  });
  await setLanguage(currentLanguage());
}

export const t = i18next.t.bind(i18next);

export function currentLanguage(): LanguageCode {
  const [base] = (i18next.language ?? DEFAULT_LANGUAGE).split('-');
  return isLanguageCode(base) ? base : DEFAULT_LANGUAGE;
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  requestedLanguage = code;
  await addLanguage(code);
  if (code === requestedLanguage) await i18next.changeLanguage(code);
}

export function onLanguageChanged(listener: (code: LanguageCode) => void): () => void {
  const handler = () => listener(currentLanguage());
  i18next.on('languageChanged', handler);
  return () => i18next.off('languageChanged', handler);
}
