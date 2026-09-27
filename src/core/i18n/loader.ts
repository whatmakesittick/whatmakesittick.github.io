import { isLanguageCode } from './languages';
import type { LanguageCode } from './languages';
import { mergeDictionaries } from './resources';
import type { Dictionary, LocaleLoader, LocaleLoaders } from './resources';

const LOCALE_FILE = /\/([a-z]+)\.json$/;

export type DictionaryLoader = (code: LanguageCode) => Promise<Dictionary>;

export function loadersByLanguage(files: Readonly<Record<string, LocaleLoader>>): LocaleLoaders {
  const loaders: LocaleLoaders = {};
  for (const [path, load] of Object.entries(files)) {
    const code = LOCALE_FILE.exec(path)?.[1];
    if (code && isLanguageCode(code)) loaders[code] = load;
  }
  return loaders;
}

function loadFrom(source: LocaleLoaders, code: LanguageCode): Promise<Dictionary> {
  return source[code]?.() ?? Promise.resolve({});
}

async function loadMerged(
  sources: readonly LocaleLoaders[],
  code: LanguageCode,
): Promise<Dictionary> {
  const dictionaries = await Promise.all(sources.map((source) => loadFrom(source, code)));
  return dictionaries.reduce(mergeDictionaries, {});
}

export function createDictionaryLoader(sources: readonly LocaleLoaders[]): DictionaryLoader {
  const loading = new Map<LanguageCode, Promise<Dictionary>>();
  return (code) => {
    const pending = loading.get(code);
    if (pending) return pending;
    const dictionary = loadMerged(sources, code).catch((error: unknown) => {
      loading.delete(code);
      throw error;
    });
    loading.set(code, dictionary);
    return dictionary;
  };
}
