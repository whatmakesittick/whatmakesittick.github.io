import { onLanguageChanged } from '../i18n';
import { catalogueHref } from '../i18n/paths';
import { queryAll } from './dom';

const LINK_SELECTOR = '[data-catalogue-link]';

function pointAtCatalogue(links: readonly HTMLAnchorElement[]): void {
  const href = catalogueHref(window.location.href, import.meta.env.BASE_URL);
  links.forEach((link) => link.setAttribute('href', href));
}

export function mountCatalogueLinks(root: Document): void {
  const links = queryAll<HTMLAnchorElement>(root, LINK_SELECTOR);
  pointAtCatalogue(links);
  onLanguageChanged(() => pointAtCatalogue(links));
}
