import { initI18n } from '@core/i18n';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';

export const TEST_LOCALE = en;
export const CHAPTER_MARKUP = chapters;

export function initTestLocale(): Promise<void> {
  return initI18n({ en: () => Promise.resolve(TEST_LOCALE) });
}

export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

const PLACEHOLDER = /\{\{|\}\}/;

export function isFilled(text: string | null | undefined): boolean {
  return Boolean(text) && !PLACEHOLDER.test(text ?? '');
}
