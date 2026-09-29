import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES } from '../src/core/i18n/languages.ts';
import type { LanguageCode } from '../src/core/i18n/languages.ts';
import type { Dictionary } from '../src/core/i18n/resources.ts';
import { readPageDates } from './dates.ts';
import type { PageDates } from './dates.ts';
import type { Dictionaries } from './i18n.ts';
import { LOCALES_DIRECTORY, readJson } from './manifest.ts';

export const ABOUT_DIRECTORY = join('src', 'site', 'about');
export const ABOUT_TEMPLATE = join(ABOUT_DIRECTORY, 'page.html');
export const ABOUT_ENTRY = join(ABOUT_DIRECTORY, 'main.ts');

export interface LoadedAbout {
  template: string;
  dictionaries: Dictionaries;
  dates: PageDates;
}

export function aboutLocaleFile(root: string, code: LanguageCode): string {
  return join(root, ABOUT_DIRECTORY, LOCALES_DIRECTORY, `${code}.json`);
}

export function loadAbout(root: string): LoadedAbout {
  const directory = join(root, ABOUT_DIRECTORY);
  return {
    template: readFileSync(join(root, ABOUT_TEMPLATE), 'utf8'),
    dictionaries: Object.fromEntries(
      LANGUAGES.map(({ code }) => [code, readJson(aboutLocaleFile(root, code)) as Dictionary]),
    ),
    dates: readPageDates(directory),
  };
}
