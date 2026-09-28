import { onLanguageChanged, rememberLanguage, t } from '../i18n';
import { isLanguageCode } from '../i18n/languages';
import { queryAll, requireElement } from './dom';

const COPYRIGHT_SELECTOR = '[data-copyright]';
const COPYRIGHT_KEY = 'footer.copyright';
const LANGUAGE_LINK_SELECTOR = '[data-language-links] a[hreflang]';

function renderCopyright(element: HTMLElement, year: number, titleKey: string): void {
  element.innerHTML = t(COPYRIGHT_KEY, { year, title: t(titleKey) });
}

function rememberLinkLanguage(link: HTMLAnchorElement): void {
  if (isLanguageCode(link.hreflang)) rememberLanguage(link.hreflang);
}

function bindLanguageLinks(root: Document): void {
  queryAll<HTMLAnchorElement>(root, LANGUAGE_LINK_SELECTOR).forEach((link) =>
    link.addEventListener('click', () => rememberLinkLanguage(link)),
  );
}

export function mountFooter(root: Document, titleKey: string): void {
  const copyright = requireElement(root, COPYRIGHT_SELECTOR);
  const year = new Date().getFullYear();
  renderCopyright(copyright, year, titleKey);
  onLanguageChanged(() => renderCopyright(copyright, year, titleKey));
  bindLanguageLinks(root);
}
