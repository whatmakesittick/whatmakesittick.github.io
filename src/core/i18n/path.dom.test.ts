import { beforeAll, describe, expect, it } from 'vitest';
import { currentLanguage, initI18n, rememberLanguage, t } from './index';

const STORAGE_KEY = 'language';

describe('language from the path', () => {
  beforeAll(async () => {
    window.localStorage.setItem(STORAGE_KEY, 'de');
    window.history.replaceState(null, '', '/ja/glider/?lang=uk');
    await initI18n({
      en: () => Promise.resolve({ demo: { hello: 'Hello' } }),
      ja: () => Promise.resolve({ demo: { hello: 'こんにちは' } }),
    });
  });

  it('prefers the language folder over the query and the stored choice', () => {
    expect(currentLanguage()).toBe('ja');
    expect(t('demo.hello')).toBe('こんにちは');
  });

  it('remembers a chosen language for pages without a language folder', () => {
    rememberLanguage('en');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
  });
});
