import { describe, expect, it } from 'vitest';
import { languagePageToOpen } from './redirect';
import type { Visit } from './redirect';

const englishGlider: Visit = {
  path: 'glider/',
  search: '',
  stored: undefined,
  browser: 'en',
  pageLanguages: ['en', 'uk', 'de'],
};

describe('languagePageToOpen', () => {
  it.each<[string, Partial<Visit>, string | undefined]>([
    ['keeps a crawler with an English browser on the English page', {}, undefined],
    [
      'keeps a browser without a supported language on the English page',
      { browser: undefined },
      undefined,
    ],
    ['opens the page in the browser language', { browser: 'uk' }, 'uk'],
    ['opens the page in the stored language', { stored: 'de' }, 'de'],
    ['lets the stored choice win over the browser', { stored: 'de', browser: 'uk' }, 'de'],
    [
      'keeps a reader who chose English on the English page',
      { stored: 'en', browser: 'uk' },
      undefined,
    ],
    ['opens the catalogue in the preferred language', { path: '', stored: 'uk' }, 'uk'],
    [
      'keeps the language query translating in place',
      { search: '?lang=de', browser: 'uk' },
      undefined,
    ],
    ['never redirects a language page', { path: 'de/glider/', stored: 'uk' }, undefined],
    ['translates in place when the page has no such language', { browser: 'ja' }, undefined],
  ])('%s', (_case, change, expected) => {
    expect(languagePageToOpen({ ...englishGlider, ...change })).toBe(expected);
  });
});
