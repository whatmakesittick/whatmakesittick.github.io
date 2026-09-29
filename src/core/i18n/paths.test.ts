import { describe, expect, it } from 'vitest';
import { languagePath, languageUrl, sitePageHref, splitLanguagePath } from './paths';

describe('languagePath', () => {
  it('keeps English at the root and prefixes every other language', () => {
    expect(languagePath('en', 'glider')).toBe('glider/');
    expect(languagePath('uk', 'glider')).toBe('uk/glider/');
    expect(languagePath('en')).toBe('');
    expect(languagePath('ja')).toBe('ja/');
  });
});

describe('splitLanguagePath', () => {
  it('reads the language prefix and the page behind it', () => {
    expect(splitLanguagePath('uk/glider/')).toEqual({ code: 'uk', page: 'glider' });
    expect(splitLanguagePath('ja/')).toEqual({ code: 'ja', page: '' });
  });

  it('leaves a path without a language prefix to the page', () => {
    expect(splitLanguagePath('glider/')).toEqual({ code: undefined, page: 'glider' });
    expect(splitLanguagePath('')).toEqual({ code: undefined, page: '' });
  });
});

describe('languageUrl', () => {
  const site = 'https://example.com';

  it('points at the same page in another language', () => {
    expect(languageUrl(`${site}/uk/glider/`, '/', 'de')).toBe(`${site}/de/glider/`);
    expect(languageUrl(`${site}/uk/glider/`, '/', 'en')).toBe(`${site}/glider/`);
    expect(languageUrl(`${site}/`, '/', 'ja')).toBe(`${site}/ja/`);
  });

  it('drops the language query and keeps the base path, other queries and the hash', () => {
    expect(languageUrl(`${site}/tick/glider/?lang=de&debug=1#wave`, '/tick/', 'fr')).toBe(
      `${site}/tick/fr/glider/?debug=1#wave`,
    );
  });
});

describe('sitePageHref', () => {
  const site = 'https://example.com';

  it('points at a site page in the language of the current page', () => {
    expect(sitePageHref(`${site}/uk/glider/`, '/', '')).toBe('/uk/');
    expect(sitePageHref(`${site}/glider/`, '/', '')).toBe('/');
    expect(sitePageHref(`${site}/uk/glider/`, '/', 'about')).toBe('/uk/about/');
  });

  it('keeps the language query of an English page and drops everything else', () => {
    expect(sitePageHref(`${site}/glider/?lang=de`, '/', '')).toBe('/?lang=de');
    expect(sitePageHref(`${site}/glider/?lang=de`, '/', 'about')).toBe('/about/?lang=de');
    expect(sitePageHref(`${site}/tick/ja/glider/?debug=1#wave`, '/tick/', '')).toBe('/tick/ja/');
  });
});
