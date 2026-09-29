import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage, t } from '@core/i18n';
import en from '../../locales/en.json';
import de from '../../locales/de.json';
import { TemplateCache } from './templates';

describe('template cache', () => {
  beforeAll(async () => {
    await initI18n({ en: () => Promise.resolve(en), de: () => Promise.resolve(de) });
    await setLanguage('en');
  });

  it('fills a template exactly as the translation does', () => {
    const cache = new TemplateCache();
    expect(cache.translate('units.kelvinCelsius', { kelvin: '111', celsius: '−162' })).toBe(
      t('units.kelvinCelsius', { kelvin: '111', celsius: '−162' }),
    );
    expect(cache.translate('units.tonnes', { value: '250' })).toBe(
      t('units.tonnes', { value: '250' }),
    );
    expect(cache.translate('units.off')).toBe(t('units.off'));
  });

  it('fills the same template again with new numbers', () => {
    const cache = new TemplateCache();
    expect(cache.translate('units.km', { value: '8.4' })).toBe('8.4 km');
    expect(cache.translate('units.km', { value: '43.0' })).toBe('43.0 km');
  });

  it('reads the template of the language in use', async () => {
    const cache = new TemplateCache();
    const english = cache.translate('units.barAbout', { value: '330' });
    await setLanguage('de');
    expect(cache.translate('units.barAbout', { value: '330' })).toBe(
      t('units.barAbout', { value: '330' }),
    );
    expect(cache.translate('units.barAbout', { value: '330' })).not.toBe(english);
    await setLanguage('en');
  });
});
