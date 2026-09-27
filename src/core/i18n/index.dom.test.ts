import { beforeAll, describe, expect, it, vi } from 'vitest';
import coreGerman from '../locales/de.json';
import coreUkrainian from '../locales/uk.json';
import { currentLanguage, initI18n, setLanguage, t } from './index';

const english = { demo: { hello: 'Hello', only: 'English only' } };
const ukrainian = { demo: { hello: 'Привіт' } };
const loadUkrainian = vi.fn(() => Promise.resolve(ukrainian));

describe('i18n', () => {
  beforeAll(async () => {
    window.history.replaceState(null, '', '/glider/?lang=uk');
    await initI18n({ en: () => Promise.resolve(english), uk: loadUkrainian });
  });

  it('reads the language query on a page without a language folder', () => {
    expect(currentLanguage()).toBe('uk');
    expect(t('demo.hello')).toBe('Привіт');
    expect(t('controls.play')).toBe(coreUkrainian.controls.play);
  });

  it('falls back to English for keys a language does not ship', () => {
    expect(t('demo.only')).toBe('English only');
  });

  it('loads a language when it is chosen', async () => {
    await setLanguage('de');
    expect(currentLanguage()).toBe('de');
    expect(t('controls.play')).toBe(coreGerman.controls.play);
    expect(t('demo.hello')).toBe('Hello');
  });

  it('keeps a loaded language instead of fetching it again', async () => {
    const calls = loadUkrainian.mock.calls.length;
    await setLanguage('uk');
    expect(t('demo.hello')).toBe('Привіт');
    expect(loadUkrainian.mock.calls.length).toBe(calls);
  });
});
