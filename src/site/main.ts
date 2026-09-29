import '@core/style.css';
import './site.css';
import { entries } from 'virtual:explainer-catalogue';
import { LANGUAGES, initI18n } from '@core/i18n';
import { mountSiteLinks } from '@core/ui/siteLinks';
import { mountFooter } from '@core/ui/footer';
import { mountLanguage } from '@core/ui/language';
import { mountCards } from './cards';

const TITLE_KEY = 'catalogue.title';
const CATALOGUE_LANGUAGES = LANGUAGES.map((language) => language.code);

function mountCatalogue(): void {
  mountCards(document, entries);
  mountLanguage(document, CATALOGUE_LANGUAGES);
  mountSiteLinks(document);
  mountFooter(document, TITLE_KEY);
}

await initI18n();
mountCatalogue();
