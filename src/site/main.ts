import '@core/style.css';
import './site.css';
import { entries, metaLoader } from 'virtual:explainer-catalogue';
import { LANGUAGES, initI18n } from '@core/i18n';
import { mountSiteLinks } from '@core/ui/siteLinks';
import { mountFooter } from '@core/ui/footer';
import { followSystemTextSize } from '@core/ui/textSize';
import { mountLanguage } from '@core/ui/language';
import { mountThemeToggle } from '@core/ui/themeToggle';
import { mountCards } from './cards';

const TITLE_KEY = 'catalogue.title';
const CATALOGUE_LANGUAGES = LANGUAGES.map((language) => language.code);

function mountCatalogue(): void {
  void mountCards(document, entries, metaLoader);
  mountThemeToggle(document);
  mountLanguage(document, CATALOGUE_LANGUAGES);
  mountSiteLinks(document);
  mountFooter(document, TITLE_KEY);
}

followSystemTextSize();
await initI18n();
mountCatalogue();
