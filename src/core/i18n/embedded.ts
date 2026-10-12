import i18next from 'i18next';
import { NAMESPACE, TRANSLATION_OPTIONS } from './config';
import { CORE_LOCALES } from './coreLocales';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from './languages';
export { resolveLanguage } from './languages';
import type { LanguageCode } from './languages';
import { createDictionaryLoader } from './loader';
import type { DictionaryLoader } from './loader';
import type { LocaleLoaders } from './resources';

let owner: LocaleLoaders | undefined;
let load: DictionaryLoader = createDictionaryLoader([CORE_LOCALES]);
let requested: LanguageCode = DEFAULT_LANGUAGE;

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
