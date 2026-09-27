import { beforeAll, describe, expect, it, vi } from 'vitest';
import { currentLanguage, initI18n } from '../i18n';
import { mountLanguage } from './language';

const assign = vi.fn();

function choose(code: string): void {
  const select = document.querySelector<HTMLSelectElement>('[data-language-select]');
  if (!select) throw new Error('No language select');
  select.value = code;
  select.dispatchEvent(new Event('change'));
}

describe('language dropdown', () => {
  beforeAll(async () => {
    vi.spyOn(window.location, 'assign').mockImplementation(assign);
    window.history.replaceState(null, '', '/uk/glider/');
    document.body.innerHTML = '<select data-language-select></select>';
    await initI18n({ en: () => Promise.resolve({}), uk: () => Promise.resolve({}) });
    mountLanguage(document, ['en', 'uk']);
  });

  it('opens the page of a language the page ships', () => {
    choose('en');
    expect(assign).toHaveBeenLastCalledWith(`${window.location.origin}/glider/`);
    expect(window.localStorage.getItem('language')).toBe('en');
  });

  it('switches in place to a language the page does not ship', async () => {
    assign.mockClear();
    choose('de');
    await vi.waitFor(() => expect(currentLanguage()).toBe('de'));
    expect(assign).not.toHaveBeenCalled();
    expect(document.documentElement.lang).toBe('de');
  });
});
