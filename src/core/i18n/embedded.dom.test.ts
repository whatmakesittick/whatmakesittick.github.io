import { describe, expect, it, vi } from 'vitest';
import coreEnglish from '../locales/en.json';
import coreGerman from '../locales/de.json';
import coreUkrainian from '../locales/uk.json';
import { resolveLanguage, useLanguage } from './embedded';
import { currentLanguage, t } from './index';
import type { LocaleLoaders } from './resources';

const english = { demo: { hello: 'Hello', only: 'English only' } };
const german = { demo: { hello: 'Hallo' } };
const ukrainian = { demo: { hello: 'Привіт' } };

function loaders() {
  return {
    en: vi.fn(() => Promise.resolve(english)),
    de: vi.fn(() => Promise.resolve(german)),
    uk: vi.fn(() => Promise.resolve(ukrainian)),
    fr: vi.fn(() => Promise.resolve({ demo: { hello: 'Bonjour' } })),
  } satisfies LocaleLoaders;
}

describe('resolveLanguage', () => {
  it('reads a code or a language tag', () => {
    expect(resolveLanguage('de')).toBe('de');
    expect(resolveLanguage('de-AT')).toBe('de');
    expect(resolveLanguage('pt_BR')).toBe('pt');
    expect(resolveLanguage('ZH-Hans-CN')).toBe('zh');
    expect(resolveLanguage(' uk ')).toBe('uk');
  });

  it('falls back to English for anything else', () => {
    expect(resolveLanguage('ru')).toBe('en');
    expect(resolveLanguage('')).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
    expect(resolveLanguage('xx-de')).toBe('en');
  });
});

describe('useLanguage', () => {
  it('loads the chosen language and English, nothing else', async () => {
    const locales = loaders();
    await expect(useLanguage(locales, 'de')).resolves.toBe('de');
    expect(currentLanguage()).toBe('de');
    expect(t('demo.hello')).toBe('Hallo');
    expect(t('controls.play')).toBe(coreGerman.controls.play);
    expect(locales.en).toHaveBeenCalledOnce();
    expect(locales.de).toHaveBeenCalledOnce();
    expect(locales.uk).not.toHaveBeenCalled();
    expect(locales.fr).not.toHaveBeenCalled();
  });

  it('falls back to English key by key', async () => {
    await useLanguage(loaders(), 'de');
    expect(t('demo.only')).toBe('English only');
  });

  it('switches in place and keeps the loaded languages', async () => {
    const locales = loaders();
    await useLanguage(locales, 'de');
    await useLanguage(locales, 'uk');
    expect(currentLanguage()).toBe('uk');
    expect(t('demo.hello')).toBe('Привіт');
    expect(t('controls.play')).toBe(coreUkrainian.controls.play);
    await useLanguage(locales, 'de');
    expect(t('demo.hello')).toBe('Hallo');
    expect(locales.de).toHaveBeenCalledOnce();
  });

  it('keeps the last request when two overlap', async () => {
    const locales = loaders();
    await Promise.all([useLanguage(locales, 'uk'), useLanguage(locales, 'de')]);
    expect(currentLanguage()).toBe('de');
  });

  it('drops the strings of the previous explainer', async () => {
    await useLanguage(loaders(), 'de');
    await useLanguage({ en: () => Promise.resolve({ other: { title: 'Other' } }) }, 'de');
    expect(t('other.title')).toBe('Other');
    expect(t('demo.hello')).toBe('demo.hello');
    expect(t('controls.play')).toBe(coreGerman.controls.play);
  });

  it('returns to English when asked for English', async () => {
    await useLanguage(loaders(), 'uk');
    await useLanguage({ en: () => Promise.resolve(english) }, 'en');
    expect(currentLanguage()).toBe('en');
    expect(t('demo.hello')).toBe('Hello');
    expect(t('controls.play')).toBe(coreEnglish.controls.play);
  });
});
