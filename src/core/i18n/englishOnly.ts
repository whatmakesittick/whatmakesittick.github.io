import i18next from 'i18next';
import en from '../locales/en.json';
import { NAMESPACE, TRANSLATION_OPTIONS } from './config';
import { DEFAULT_LANGUAGE } from './languages';
import { mergeDictionaries } from './resources';
import type { Dictionary } from './resources';

export function useEnglishOnly(dictionary: Dictionary): void {
  const resources = mergeDictionaries(en, dictionary);
  if (!i18next.isInitialized) {
    void i18next.init({
      ...TRANSLATION_OPTIONS,
      lng: DEFAULT_LANGUAGE,
      supportedLngs: [DEFAULT_LANGUAGE],
      initAsync: false,
      resources: { [DEFAULT_LANGUAGE]: { [NAMESPACE]: resources } },
    });
    return;
  }
  i18next.removeResourceBundle(DEFAULT_LANGUAGE, NAMESPACE);
  i18next.addResourceBundle(DEFAULT_LANGUAGE, NAMESPACE, resources);
  if (i18next.language !== DEFAULT_LANGUAGE) void i18next.changeLanguage(DEFAULT_LANGUAGE);
}
