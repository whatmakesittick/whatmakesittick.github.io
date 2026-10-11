import { describe, expect, it } from 'vitest';
import coreEnglish from '../locales/en.json';
import { LANGUAGE_STORAGE_KEY } from './redirect';
import { useEnglishOnly } from './englishOnly';
import { currentLanguage, t } from './index';

describe('useEnglishOnly', () => {
  it('shows English whatever the reader stored or the browser prefers', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    window.history.replaceState(null, '', '/de/glider/?lang=uk');
    useEnglishOnly({ demo: { hello: 'Hello' } });
    expect(currentLanguage()).toBe('en');
    expect(t('demo.hello')).toBe('Hello');
    expect(t('controls.play')).toBe(coreEnglish.controls.play);
  });

  it('swaps the explainer strings and keeps the core ones', () => {
    useEnglishOnly({ demo: { hello: 'Hello' } });
    useEnglishOnly({ other: { title: 'Other' } });
    expect(t('other.title')).toBe('Other');
    expect(t('demo.hello')).toBe('demo.hello');
    expect(t('controls.play')).toBe(coreEnglish.controls.play);
  });
});
