import { t } from './index';
import { ATTRIBUTES_ATTRIBUTE, HTML_ATTRIBUTE, TEXT_ATTRIBUTE, parseAttributeKeys } from './markup';

export function translateDom(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(`[${TEXT_ATTRIBUTE}]`).forEach((element) => {
    element.textContent = t(element.getAttribute(TEXT_ATTRIBUTE) ?? '');
  });
  root.querySelectorAll<HTMLElement>(`[${HTML_ATTRIBUTE}]`).forEach((element) => {
    element.innerHTML = t(element.getAttribute(HTML_ATTRIBUTE) ?? '');
  });
  root.querySelectorAll<HTMLElement>(`[${ATTRIBUTES_ATTRIBUTE}]`).forEach((element) => {
    parseAttributeKeys(element.getAttribute(ATTRIBUTES_ATTRIBUTE) ?? '').forEach(
      ([attribute, key]) => element.setAttribute(attribute, t(key)),
    );
  });
}
