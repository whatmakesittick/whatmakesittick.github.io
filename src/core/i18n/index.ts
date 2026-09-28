import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import { NAMESPACE, TRANSLATION_OPTIONS } from './config';
import { DEFAULT_LANGUAGE, LANGUAGES, baseLanguage } from './languages';
import type { LanguageCode } from './languages';
import { createDictionaryLoader, loadersByLanguage } from './loader';
import type { DictionaryLoader } from './loader';
import { LANGUAGE_QUERY_KEY } from './paths';
import { LANGUAGE_STORAGE_KEY } from './redirect';
import type { Dictionary, LocaleLoaders } from './resources';

export { DEFAULT_LANGUAGE, LANGUAGES } from './languages';
export type { Language, LanguageCode } from './languages';
export { shippedLanguages } from './loader';
export { LANGUAGE_QUERY_KEY } from './paths';
export type { Dictionary, LocaleLoader, LocaleLoaders } from './resources';

const STORED_SOURCE = 'localStorage';
const BROWSER_SOURCE = 'navigator';
const BASE_SEGMENTS = import.meta.env.BASE_URL.split('/').filter(Boolean).length;

const CORE_LOCALES: LocaleLoaders = {
  ...loadersByLanguage(
    import.meta.glob<Dictionary>(['../locales/*.json', '!../locales/en.json'], {
      import: 'default',
    }),
  ),
  [DEFAULT_LANGUAGE]: () => Promise.resolve(en),
};

const detector = new LanguageDetector();
let loadDictionary: DictionaryLoader = createDictionaryLoader([CORE_LOCALES]);
let requestedLanguage: LanguageCode = DEFAULT_LANGUAGE;

async function addLanguage(code: LanguageCode): Promise<void> {
  if (i18next.hasResourceBundle(code, NAMESPACE)) return;
  i18next.addResourceBundle(code, NAMESPACE, await loadDictionary(code));
}

export async function initI18n(locales: LocaleLoaders = {}): Promise<void> {
  loadDictionary = createDictionaryLoader([CORE_LOCALES, locales]);
  const fallback = await loadDictionary(DEFAULT_LANGUAGE);
  await i18next.use(detector).init({
    ...TRANSLATION_OPTIONS,
    resources: { [DEFAULT_LANGUAGE]: { [NAMESPACE]: fallback } },
    supportedLngs: LANGUAGES.map((language) => language.code),
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['path', 'querystring', STORED_SOURCE, BROWSER_SOURCE],
      lookupFromPathIndex: BASE_SEGMENTS,
      lookupQuerystring: LANGUAGE_QUERY_KEY,
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: [],
    },
  });
  await setLanguage(currentLanguage());
}

export const t = i18next.t.bind(i18next);

export function currentLanguage(): LanguageCode {
  return baseLanguage(i18next.language ?? DEFAULT_LANGUAGE) ?? DEFAULT_LANGUAGE;
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  requestedLanguage = code;
  await addLanguage(code);
  if (code === requestedLanguage) await i18next.changeLanguage(code);
}

export function rememberLanguage(code: LanguageCode): void {
  detector.cacheUserLanguage(code, [STORED_SOURCE]);
}

export function onLanguageChanged(listener: (code: LanguageCode) => void): () => void {
  const handler = () => listener(currentLanguage());
  i18next.on('languageChanged', handler);
  return () => i18next.off('languageChanged', handler);
}
