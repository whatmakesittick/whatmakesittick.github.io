import { onLanguageChanged, t } from '../i18n';
import { requireElement } from './dom';

const COPYRIGHT_SELECTOR = '[data-copyright]';
const COPYRIGHT_KEY = 'footer.copyright';

function renderCopyright(element: HTMLElement, year: number, titleKey: string): void {
  element.innerHTML = t(COPYRIGHT_KEY, { year, title: t(titleKey) });
}

export function mountFooter(root: Document, titleKey: string): void {
  const copyright = requireElement(root, COPYRIGHT_SELECTOR);
  const year = new Date().getFullYear();
  renderCopyright(copyright, year, titleKey);
  onLanguageChanged(() => renderCopyright(copyright, year, titleKey));
}
