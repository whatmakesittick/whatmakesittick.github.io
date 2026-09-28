import { PAGE_LANGUAGES_SEPARATOR, languagePageUrl } from './redirect.ts';

const url = languagePageUrl(
  { location, navigator, storage: () => localStorage },
  document.currentScript?.dataset.languages?.split(PAGE_LANGUAGES_SEPARATOR) ?? [],
  import.meta.env.BASE_URL,
);
if (url) location.replace(url);
