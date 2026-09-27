import { join } from 'node:path';
import i18next from 'i18next';
import { NAMESPACE, TRANSLATION_OPTIONS } from '../src/core/i18n/config.ts';
import { LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import { mergeDictionaries } from '../src/core/i18n/resources.ts';
import type { Dictionary } from '../src/core/i18n/resources.ts';
import { readJson } from './manifest.ts';

export const CORE_LOCALES_DIRECTORY = join('src', 'core', 'locales');

export type Dictionaries = Partial<Record<LanguageCode, Dictionary>>;
export type Translate = (key: string) => string;

export interface PageLanguage {
  code: LanguageCode;
  translate: Translate;
}

const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

function coreLocaleFile(root: string, code: LanguageCode): string {
  return join(root, CORE_LOCALES_DIRECTORY, `${code}.json`);
}

export function loadCoreDictionaries(root: string): Dictionaries {
  return Object.fromEntries(
    LANGUAGE_CODES.map((code) => [code, readJson(coreLocaleFile(root, code)) as Dictionary]),
  );
}

export function mergeLocales(core: Dictionaries, own: Dictionaries): Dictionaries {
  return Object.fromEntries(
    LANGUAGE_CODES.flatMap((code) => {
      const dictionary = own[code];
      return dictionary ? [[code, mergeDictionaries(core[code] ?? {}, dictionary)]] : [];
    }),
  );
}

function resources(dictionaries: Dictionaries) {
  return Object.fromEntries(
    Object.entries(dictionaries).map(([code, dictionary]) => [code, { [NAMESPACE]: dictionary }]),
  );
}

export function pageLanguage(dictionaries: Dictionaries, code: LanguageCode): PageLanguage {
  const instance = i18next.createInstance();
  void instance.init({
    ...TRANSLATION_OPTIONS,
    initAsync: false,
    lng: code,
    resources: resources(dictionaries),
  });
  return { code, translate: (key) => instance.t(key) };
}
