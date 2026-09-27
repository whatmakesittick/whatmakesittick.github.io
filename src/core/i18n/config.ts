import { DEFAULT_LANGUAGE } from './languages.ts';

export const NAMESPACE = 'translation';

export const TRANSLATION_OPTIONS = {
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
} as const;
