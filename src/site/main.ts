import '@core/style.css';
import './site.css';
import { entries } from 'virtual:explainer-catalogue';
import { initI18n } from '@core/i18n';
import { mountFooter } from '@core/ui/footer';
import { mountLanguage } from '@core/ui/language';
import { mountCards } from './cards';

const TITLE_KEY = 'catalogue.title';

await initI18n();
mountCards(document, entries);
mountLanguage(document);
mountFooter(document, TITLE_KEY);
