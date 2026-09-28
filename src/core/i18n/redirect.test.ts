import { describe, expect, it } from 'vitest';
import { languageUrl } from './paths';
import { languagePageToOpen, languagePageUrl } from './redirect';
import type { RedirectEnvironment, Visit } from './redirect';

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

interface Reader {
  href: string;
  stored?: string;
  browser?: string[];
  blockedStorage?: boolean;
}

const ORIGIN = 'https://example.org';
const ROOT = '/';
const EXPLAINER_LANGUAGES = ['en', 'uk', 'de'];

function environment({ href, stored, browser = [], blockedStorage = false }: Reader) {
  const { pathname, search, hash } = new URL(href, ORIGIN);
  const reader: RedirectEnvironment = {
    location: { pathname, search, hash },
    navigator: { languages: browser },
    storage: () => {
      if (blockedStorage) throw new DOMException('Blocked', 'SecurityError');
      return { getItem: () => stored ?? null };
    },
  };
  return reader;
}

describe('languagePageUrl', () => {
  it.each<[string, Reader, string | undefined]>([
    ['opens the stored language', { href: '/solar-panel/', stored: 'uk' }, '/uk/solar-panel/'],
    ['stays on a language page', { href: '/uk/solar-panel/', stored: 'de' }, undefined],
    [
      'keeps the language query in place',
      { href: '/solar-panel/?lang=uk', stored: 'uk' },
      undefined,
    ],
    ['opens the browser language', { href: '/engine/', browser: ['de-DE', 'en'] }, '/de/engine/'],
    [
      'skips browser languages the site lacks',
      { href: '/engine/', browser: ['ru', 'uk'] },
      '/uk/engine/',
    ],
    [
      'stays for a reader who chose English',
      { href: '/engine/', stored: 'en', browser: ['de'] },
      undefined,
    ],
    ['stays when the page lacks the language', { href: '/engine/', stored: 'ja' }, undefined],
    [
      'keeps the query and the hash',
      { href: '/?tag=energy#top', stored: 'uk' },
      '/uk/?tag=energy#top',
    ],
    [
      'uses the browser when storage is blocked',
      { href: '/engine/', stored: 'uk', browser: ['de'], blockedStorage: true },
      '/de/engine/',
    ],
  ])('%s', (_case, reader, expected) => {
    expect(languagePageUrl(environment(reader), EXPLAINER_LANGUAGES, ROOT)).toBe(expected);
  });

  it('opens the same page as the language dropdown', () => {
    const href = `${ORIGIN}/repo/glider/?tag=flight`;
    const url = languagePageUrl(environment({ href, stored: 'de' }), EXPLAINER_LANGUAGES, '/repo/');
    expect(`${ORIGIN}${url}`).toBe(languageUrl(href, '/repo/', 'de'));
  });
});
