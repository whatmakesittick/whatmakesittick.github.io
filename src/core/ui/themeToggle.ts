import { t } from '../i18n';
import { formatAttributeKeys } from '../i18n/markup';
import { otherScheme, storeScheme } from '../scheme';
import type { Scheme } from '../scheme';
import { activeScheme } from '../theme';
import { queryAll } from './dom';

export interface ThemeToggleEnvironment {
  storage(): { setItem(key: string, value: string): void };
  reload(): void;
}

const TOGGLE_SELECTOR = '[data-theme-toggle]';
const LABELLED_ATTRIBUTES = ['aria-label', 'title'] as const;
const SWITCH_KEYS: Readonly<Record<Scheme, string>> = {
  light: 'header.themeLight',
  dark: 'header.themeDark',
};

const BROWSER: ThemeToggleEnvironment = {
  storage: () => window.localStorage,
  reload: () => window.location.reload(),
};

function label(button: HTMLButtonElement, key: string): void {
  button.dataset.i18nAttr = formatAttributeKeys(
    LABELLED_ATTRIBUTES.map((attribute) => [attribute, key] as const),
  );
  LABELLED_ATTRIBUTES.forEach((attribute) => button.setAttribute(attribute, t(key)));
}

export function mountThemeToggle(
  root: Document,
  environment: ThemeToggleEnvironment = BROWSER,
): void {
  const next = otherScheme(activeScheme());
  queryAll<HTMLButtonElement>(root, TOGGLE_SELECTOR).forEach((button) => {
    label(button, SWITCH_KEYS[next]);
    button.addEventListener('click', () => {
      if (storeScheme(environment.storage, next)) environment.reload();
    });
  });
}
