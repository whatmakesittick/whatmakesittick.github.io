import type { LanguageCode } from './languages.ts';

export type Dictionary = { [key: string]: string | Dictionary };
export type LocaleLoader = () => Promise<Dictionary>;
export type LocaleLoaders = Partial<Record<LanguageCode, LocaleLoader>>;

function isDictionary(value: string | Dictionary | undefined): value is Dictionary {
  return typeof value === 'object' && value !== null;
}

export function mergeDictionaries(base: Dictionary, override: Dictionary): Dictionary {
  const merged: Dictionary = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    merged[key] =
      isDictionary(current) && isDictionary(value) ? mergeDictionaries(current, value) : value;
  }
  return merged;
}
