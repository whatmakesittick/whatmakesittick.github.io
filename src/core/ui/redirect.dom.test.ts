import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n';
import { openPreferredLanguagePage } from './language';

const replace = vi.fn();
const PAGE_LANGUAGES = ['en', 'uk'] as const;

describe('returning readers', () => {
  beforeAll(async () => {
    vi.spyOn(window.location, 'replace').mockImplementation(replace);
    window.localStorage.setItem('language', 'uk');
    window.history.replaceState(null, '', '/glider/');
    await initI18n({ en: () => Promise.resolve({}), uk: () => Promise.resolve({}) });
  });

  it('opens the page in the stored language instead of the English one', () => {
    expect(openPreferredLanguagePage(PAGE_LANGUAGES)).toBe(true);
    expect(replace).toHaveBeenLastCalledWith(`${window.location.origin}/uk/glider/`);
  });

  it('keeps the language query translating in place', () => {
    replace.mockClear();
    window.history.replaceState(null, '', '/glider/?lang=de');
    expect(openPreferredLanguagePage(PAGE_LANGUAGES)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
