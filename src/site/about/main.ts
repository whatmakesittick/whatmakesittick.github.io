import '@core/style.css';
import '../site.css';
import './about.css';
import { DEFAULT_LANGUAGE, LANGUAGES, initI18n } from '@core/i18n';
import type { Dictionary, LocaleLoaders } from '@core/i18n';
import { loadersByLanguage } from '@core/i18n/loader';
import { mountFooter } from '@core/ui/footer';
import { mountLanguage } from '@core/ui/language';
import { mountSiteLinks } from '@core/ui/siteLinks';
import en from './locales/en.json';

const TITLE_KEY = 'catalogue.title';
const ABOUT_LANGUAGES = LANGUAGES.map((language) => language.code);
const ABOUT_LOCALES: LocaleLoaders = {
  ...loadersByLanguage(
    import.meta.glob<Dictionary>(['./locales/*.json', '!./locales/en.json'], {
      import: 'default',
    }),
  ),
  [DEFAULT_LANGUAGE]: () => Promise.resolve(en),
};

function mountAbout(): void {
  mountLanguage(document, ABOUT_LANGUAGES);
  mountSiteLinks(document);
  mountFooter(document, TITLE_KEY);
}

await initI18n(ABOUT_LOCALES);
mountAbout();
