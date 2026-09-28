import { describe, expect, it } from 'vitest';
import { LANGUAGES, LANGUAGE_CODES, baseLanguage, isLanguageCode } from './languages';

describe('languages', () => {
  it('lists every language code once, in the order of the language list', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual([...LANGUAGE_CODES]);
  });

  it('recognises only the site languages', () => {
    expect(isLanguageCode('uk')).toBe(true);
    expect(isLanguageCode('ru')).toBe(false);
  });

  it('reduces a regional code to its site language', () => {
    expect(baseLanguage('de-DE')).toBe('de');
    expect(baseLanguage('ru-RU')).toBeUndefined();
  });
});
