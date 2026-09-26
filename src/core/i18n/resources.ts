import type { LanguageCode } from './languages';

export type Dictionary = { [key: string]: string | Dictionary };
export type LocaleBundle = Partial<Record<LanguageCode, Dictionary>>;

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

export function mergeBundles(base: LocaleBundle, override: LocaleBundle): LocaleBundle {
  const codes = new Set([...Object.keys(base), ...Object.keys(override)]) as Set<LanguageCode>;
  return Object.fromEntries(
    [...codes].map((code) => [code, mergeDictionaries(base[code] ?? {}, override[code] ?? {})]),
  );
}
