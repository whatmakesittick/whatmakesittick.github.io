import {
  LANGUAGES,
  LANGUAGE_QUERY_KEY,
  currentLanguage,
  onLanguageChanged,
  rememberLanguage,
  setLanguage,
} from '../i18n';
import type { LanguageCode } from '../i18n';
import { translateDom } from '../i18n/dom';
import { languageUrl } from '../i18n/paths';
import { html, queryAll } from './dom';
import { parseOption } from './parse';

const SELECT_SELECTOR = '[data-language-select]';
const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

function languageOptions(): HTMLOptionElement[] {
  return LANGUAGES.map((language) =>
    html('option', { value: language.code, lang: language.code }, [language.label]),
  );
}

function languagePageUrl(code: LanguageCode): string {
  return languageUrl(window.location.href, import.meta.env.BASE_URL, code);
}

function openLanguagePage(code: LanguageCode): void {
  rememberLanguage(code);
  window.location.assign(languagePageUrl(code));
}

function chooseLanguage(code: LanguageCode, pageLanguages: readonly LanguageCode[]): void {
  if (pageLanguages.includes(code)) openLanguagePage(code);
  else void setLanguage(code);
}

function bindSelect(select: HTMLSelectElement, pageLanguages: readonly LanguageCode[]): void {
  select.replaceChildren(...languageOptions());
  select.addEventListener('change', () => {
    chooseLanguage(parseOption(select.value, LANGUAGE_CODES), pageLanguages);
  });
}

function syncQueryString(code: LanguageCode): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LANGUAGE_QUERY_KEY)) return;
  url.searchParams.set(LANGUAGE_QUERY_KEY, code);
  window.history.replaceState(window.history.state, '', url);
}

function applyLanguage(root: Document, selects: HTMLSelectElement[], code: LanguageCode): void {
  root.documentElement.lang = code;
  translateDom(root);
  selects.forEach((select) => (select.value = code));
  syncQueryString(code);
}

export function mountLanguage(root: Document, pageLanguages: readonly LanguageCode[]): void {
  const selects = queryAll<HTMLSelectElement>(root, SELECT_SELECTOR);
  selects.forEach((select) => bindSelect(select, pageLanguages));
  applyLanguage(root, selects, currentLanguage());
  onLanguageChanged((code) => applyLanguage(root, selects, code));
}
