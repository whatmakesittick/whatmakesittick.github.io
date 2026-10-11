import i18next from 'i18next';
import en from '../locales/en.json';
import { NAMESPACE, TRANSLATION_OPTIONS } from './config';
import { CORE_LOCALES } from './coreLocales';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, baseLanguage } from './languages';
import type { LanguageCode } from './languages';
import { createDictionaryLoader } from './loader';
import type { DictionaryLoader } from './loader';
import { mergeDictionaries } from './resources';
import type { Dictionary, LocaleLoaders } from './resources';

let owner: LocaleLoaders | undefined;
let load: DictionaryLoader = createDictionaryLoader([CORE_LOCALES]);
let requested: LanguageCode = DEFAULT_LANGUAGE;

export function resolveLanguage(language: string | undefined): LanguageCode {
  const tag = (language ?? '').trim().replaceAll('_', '-').toLowerCase();
  return baseLanguage(tag) ?? DEFAULT_LANGUAGE;
}

function adopt(locales: LocaleLoaders): void {
  if (!i18next.isInitialized) {
    void i18next.init({
      ...TRANSLATION_OPTIONS,
      lng: DEFAULT_LANGUAGE,
      supportedLngs: [...LANGUAGE_CODES],
      initAsync: false,
      resources: {},
    });
  }
  if (locales === owner) return;
  owner = locales;
  load = createDictionaryLoader([CORE_LOCALES, locales]);
  for (const code of LANGUAGE_CODES) i18next.removeResourceBundle(code, NAMESPACE);
}

export async function useLanguage(
  locales: LocaleLoaders,
  code: LanguageCode,
): Promise<LanguageCode> {
  adopt(locales);
  requested = code;
  const loader = load;
  const needed = code === DEFAULT_LANGUAGE ? [code] : [DEFAULT_LANGUAGE, code];
  const missing = needed.filter((language) => !i18next.hasResourceBundle(language, NAMESPACE));
  const dictionaries = await Promise.all(missing.map((language) => loader(language)));
  if (owner !== locales) return code;
  missing.forEach((language, index) => {
    i18next.addResourceBundle(language, NAMESPACE, dictionaries[index] ?? {});
  });
  if (requested === code && i18next.language !== code) await i18next.changeLanguage(code);
  return code;
}

export function useEnglishOnly(dictionary: Dictionary): void {
  adopt({ [DEFAULT_LANGUAGE]: () => Promise.resolve(dictionary) });
  requested = DEFAULT_LANGUAGE;
  i18next.addResourceBundle(DEFAULT_LANGUAGE, NAMESPACE, mergeDictionaries(en, dictionary));
  if (i18next.language !== DEFAULT_LANGUAGE) void i18next.changeLanguage(DEFAULT_LANGUAGE);
}
