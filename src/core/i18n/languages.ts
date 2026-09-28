export const LANGUAGE_CODES = ['en', 'zh', 'es', 'uk', 'pt', 'fr', 'de', 'ja'] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface Language {
  code: LanguageCode;
  label: string;
  locale: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', label: 'English', locale: 'en_GB' },
  { code: 'zh', label: '中文', locale: 'zh_CN' },
  { code: 'es', label: 'Español', locale: 'es_ES' },
  { code: 'uk', label: 'Українська', locale: 'uk_UA' },
  { code: 'pt', label: 'Português', locale: 'pt_BR' },
  { code: 'fr', label: 'Français', locale: 'fr_FR' },
  { code: 'de', label: 'Deutsch', locale: 'de_DE' },
  { code: 'ja', label: '日本語', locale: 'ja_JP' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(code: string): code is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(code);
}

export function baseLanguage(code: string): LanguageCode | undefined {
  const [base] = code.split('-');
  return isLanguageCode(base) ? base : undefined;
}
