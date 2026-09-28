import { describe, expect, it, vi } from 'vitest';
import { REDIRECT_SCRIPT } from './redirectScript.ts';

const MAX_SCRIPT_BYTES = 1024;
const PAGE_LANGUAGES = 'en uk de';

interface Visit {
  path: string;
  stored?: string;
  browser?: string[];
}

function visit({ path, stored, browser = ['en-GB'] }: Visit): string | undefined {
  const { pathname, search, hash } = new URL(path, 'https://example.org');
  const replace = vi.fn();
  const location = { pathname, search, hash, replace };
  const navigator = { languages: browser };
  const localStorage = { getItem: () => stored ?? null };
  const document = { currentScript: { dataset: { languages: PAGE_LANGUAGES } } };
  const run = new Function('location', 'navigator', 'localStorage', 'document', REDIRECT_SCRIPT);
  run(location, navigator, localStorage, document);
  return replace.mock.calls[0]?.[0];
}

describe('REDIRECT_SCRIPT', () => {
  it('fits in a kilobyte', () => {
    expect(new TextEncoder().encode(REDIRECT_SCRIPT).length).toBeLessThan(MAX_SCRIPT_BYTES);
  });

  it.each<[string, Visit, string | undefined]>([
    ['opens the stored language', { path: '/solar-panel/', stored: 'uk' }, '/uk/solar-panel/'],
    ['stays on a language page', { path: '/uk/solar-panel/', stored: 'uk' }, undefined],
    [
      'keeps the language query in place',
      { path: '/solar-panel/?lang=uk', stored: 'uk' },
      undefined,
    ],
    ['opens the browser language', { path: '/engine/', browser: ['de-DE'] }, '/de/engine/'],
    ['stays in English for an English browser', { path: '/engine/' }, undefined],
    ['stays when the page lacks the language', { path: '/engine/', browser: ['ja'] }, undefined],
  ])('%s', (_case, reader, expected) => {
    expect(visit(reader)).toBe(expected);
  });
});
