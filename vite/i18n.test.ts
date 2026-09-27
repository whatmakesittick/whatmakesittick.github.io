import { describe, expect, it } from 'vitest';
import { mergeLocales, pageLanguage } from './i18n.ts';

const core = {
  en: { controls: { play: 'Play', label: 'Controls' }, greeting: 'Hello {{name}}' },
  uk: { controls: { play: 'Грати', label: 'Керування' }, greeting: 'Привіт, {{name}}' },
};

describe('mergeLocales', () => {
  it('merges the core copy under every language the page ships', () => {
    const merged = mergeLocales(core, { en: { controls: { label: 'Engine' } } });
    expect(merged).toEqual({ en: { ...core.en, controls: { play: 'Play', label: 'Engine' } } });
  });
});

describe('pageLanguage', () => {
  it('translates with the runtime options and falls back to English', () => {
    const { code, translate } = pageLanguage(
      { en: { ...core.en, only: 'English only' }, uk: core.uk },
      'uk',
    );
    expect(code).toBe('uk');
    expect(translate('controls.play')).toBe('Грати');
    expect(translate('only')).toBe('English only');
    expect(translate('missing.key')).toBe('missing.key');
  });
});
