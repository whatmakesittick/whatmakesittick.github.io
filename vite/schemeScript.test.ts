import { describe, expect, it } from 'vitest';
import { SCHEME_SCRIPT } from './schemeScript.ts';

const MAX_SCRIPT_BYTES = 1024;

interface Visit {
  stored?: string | null;
  storage?: 'blocked';
  system?: 'light' | 'dark' | 'unsupported';
}

interface Page {
  theme: string | undefined;
  colors: string[];
}

function visit({ stored = null, storage, system = 'dark' }: Visit): Page {
  const colors = [{ content: '#1e1b17' }, { content: '#f4f3ef' }];
  const documentElement = { dataset: {} as Record<string, string> };
  const document = { documentElement, querySelectorAll: () => colors };
  const localStorage = {
    getItem: () => {
      if (storage === 'blocked') throw new Error('blocked');
      return stored;
    },
  };
  const matchMedia = (query: string) => {
    if (system === 'unsupported') throw new Error('unsupported');
    return { matches: query.includes(system) };
  };
  const run = new Function('document', 'localStorage', 'matchMedia', SCHEME_SCRIPT);
  run(document, localStorage, matchMedia);
  return { theme: documentElement.dataset.theme, colors: colors.map((color) => color.content) };
}

const SYSTEM_COLORS = ['#1e1b17', '#f4f3ef'];

describe('SCHEME_SCRIPT', () => {
  it('fits in a kilobyte', () => {
    expect(new TextEncoder().encode(SCHEME_SCRIPT).length).toBeLessThan(MAX_SCRIPT_BYTES);
  });

  it.each<[string, Visit, Page]>([
    ['follows a dark system', {}, { theme: 'dark', colors: SYSTEM_COLORS }],
    ['follows a light system', { system: 'light' }, { theme: 'light', colors: SYSTEM_COLORS }],
    [
      'prefers the stored light scheme over a dark system',
      { stored: 'light' },
      { theme: 'light', colors: ['#f4f3ef', '#f4f3ef'] },
    ],
    [
      'prefers the stored dark scheme over a light system',
      { stored: 'dark', system: 'light' },
      { theme: 'dark', colors: ['#1e1b17', '#1e1b17'] },
    ],
    [
      'ignores a stored value that is no scheme',
      { stored: 'sepia', system: 'light' },
      { theme: 'light', colors: SYSTEM_COLORS },
    ],
    [
      'falls back to the system when storage is blocked',
      { storage: 'blocked', system: 'light' },
      { theme: 'light', colors: SYSTEM_COLORS },
    ],
    [
      'falls back to dark without media queries',
      { system: 'unsupported' },
      { theme: 'dark', colors: SYSTEM_COLORS },
    ],
  ])('%s', (_case, reader, expected) => {
    expect(visit(reader)).toEqual(expected);
  });
});
