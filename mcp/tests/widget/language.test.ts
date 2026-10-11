import { describe, expect, it } from 'vitest';
import {
  NO_SIGNALS,
  languageOf,
  withContext,
  withInput,
  withResult,
} from '../../widget/src/i18n/language.ts';

const result = (lang?: string) => ({
  content: [],
  structuredContent: { slug: 'engine', ...(lang ? { lang } : {}) },
});

describe('widget language', () => {
  it('falls back to English with no signal', () => {
    expect(languageOf(NO_SIGNALS)).toBe('en');
  });

  it('reads the host locale', () => {
    expect(languageOf(withContext(NO_SIGNALS, { locale: 'uk-UA' }))).toBe('uk');
    expect(languageOf(withContext(NO_SIGNALS, { locale: 'pt_BR' }))).toBe('pt');
    expect(languageOf(withContext(NO_SIGNALS, { locale: 'ru-RU' }))).toBe('en');
  });

  it('prefers the tool argument, then the result, then the host locale', () => {
    const host = withContext(NO_SIGNALS, { locale: 'de-DE' });
    expect(languageOf(withResult(host, result('ja')))).toBe('ja');
    const asked = withInput(host, { slug: 'engine', lang: 'uk' });
    expect(languageOf(asked)).toBe('uk');
    expect(languageOf(withResult(asked, result('zh')))).toBe('uk');
    expect(languageOf(withInput(host, { slug: 'engine' }))).toBe('de');
  });

  it('resolves an unsupported argument to English, not to the host locale', () => {
    const host = withContext(NO_SIGNALS, { locale: 'de-DE' });
    expect(languageOf(withInput(host, { slug: 'engine', lang: 'ru' }))).toBe('en');
  });

  it('ignores empty or malformed values', () => {
    const host = withContext(NO_SIGNALS, { locale: 'fr-FR' });
    expect(languageOf(withInput(host, { slug: 'engine', lang: ' ' }))).toBe('fr');
    expect(languageOf(withInput(host, { slug: 'engine', lang: 3 }))).toBe('fr');
    expect(languageOf(withResult(host, { structuredContent: { lang: null } }))).toBe('fr');
    expect(languageOf(withResult(host, 'nothing'))).toBe('fr');
    expect(withContext(host, {})).toBe(host);
  });

  it('switches when a later call or context changes the answer', () => {
    let signals = withContext(NO_SIGNALS, { locale: 'en-US' });
    signals = withInput(signals, { slug: 'engine', lang: 'uk' });
    signals = withResult(signals, result('uk'));
    expect(languageOf(signals)).toBe('uk');
    signals = withInput(signals, { slug: 'heart', lang: 'de' });
    expect(languageOf(signals)).toBe('de');
    signals = withInput(signals, { slug: 'heart' });
    expect(languageOf(signals)).toBe('en');
    signals = withContext(signals, { locale: 'ja-JP' });
    expect(languageOf(signals)).toBe('ja');
  });

  it('forgets the previous result when a new call starts', () => {
    let signals = withResult(NO_SIGNALS, result('zh'));
    expect(languageOf(signals)).toBe('zh');
    signals = withInput(signals, { slug: 'heart' });
    expect(languageOf(signals)).toBe('en');
  });
});
