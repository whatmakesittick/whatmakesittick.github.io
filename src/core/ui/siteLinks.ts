import { onLanguageChanged } from '../i18n';
import { sitePageHref } from '../i18n/paths';
import { ABOUT_PAGE, CATALOGUE_PAGE } from '../pages';
import { queryAll } from './dom';

const SITE_LINKS = [
  { selector: '[data-catalogue-link]', page: CATALOGUE_PAGE },
  { selector: '[data-about-link]', page: ABOUT_PAGE },
] as const;

function pointAt(links: readonly HTMLAnchorElement[], page: string): void {
  const href = sitePageHref(window.location.href, import.meta.env.BASE_URL, page);
  links.forEach((link) => link.setAttribute('href', href));
}

export function mountSiteLinks(root: Document): void {
  const groups = SITE_LINKS.map(({ selector, page }) => ({
    links: queryAll<HTMLAnchorElement>(root, selector),
    page,
  }));
  const point = () => groups.forEach(({ links, page }) => pointAt(links, page));
  point();
  onLanguageChanged(point);
}
