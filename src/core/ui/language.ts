import {
  LANGUAGES,
  LANGUAGE_QUERY_KEY,
  currentLanguage,
  onLanguageChanged,
  setLanguage,
} from '../i18n';
import type { LanguageCode } from '../i18n';
import { translateDom } from '../i18n/dom';
import { html, queryAll } from './dom';
import { parseOption } from './parse';

const SELECT_SELECTOR = '[data-language-select]';
const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

function languageOptions(): HTMLOptionElement[] {
  return LANGUAGES.map((language) =>
    html('option', { value: language.code, lang: language.code }, [language.label]),
  );
}

function bindSelect(select: HTMLSelectElement): void {
  select.replaceChildren(...languageOptions());
  select.addEventListener('change', () => {
    void setLanguage(parseOption(select.value, LANGUAGE_CODES));
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

export function mountLanguage(root: Document): void {
  const selects = queryAll<HTMLSelectElement>(root, SELECT_SELECTOR);
  selects.forEach(bindSelect);
  applyLanguage(root, selects, currentLanguage());
  onLanguageChanged((code) => applyLanguage(root, selects, code));
}
