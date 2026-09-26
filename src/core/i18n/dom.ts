import { t } from './index';

const TEXT_ATTRIBUTE = 'data-i18n';
const HTML_ATTRIBUTE = 'data-i18n-html';
const ATTRIBUTES_ATTRIBUTE = 'data-i18n-attr';
const PAIR_SEPARATOR = ';';
const KEY_SEPARATOR = ':';

function translateAttributes(element: Element, spec: string): void {
  spec
    .split(PAIR_SEPARATOR)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [attribute, key] = pair.split(KEY_SEPARATOR).map((part) => part.trim());
      if (attribute && key) element.setAttribute(attribute, t(key));
    });
}

export function translateDom(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(`[${TEXT_ATTRIBUTE}]`).forEach((element) => {
    element.textContent = t(element.getAttribute(TEXT_ATTRIBUTE) ?? '');
  });
  root.querySelectorAll<HTMLElement>(`[${HTML_ATTRIBUTE}]`).forEach((element) => {
    element.innerHTML = t(element.getAttribute(HTML_ATTRIBUTE) ?? '');
  });
  root.querySelectorAll<HTMLElement>(`[${ATTRIBUTES_ATTRIBUTE}]`).forEach((element) => {
    translateAttributes(element, element.getAttribute(ATTRIBUTES_ATTRIBUTE) ?? '');
  });
}
