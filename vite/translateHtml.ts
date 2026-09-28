import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import {
  ATTRIBUTES_ATTRIBUTE,
  HTML_ATTRIBUTE,
  TEXT_ATTRIBUTE,
  VALUES_ATTRIBUTE,
  parseAttributeKeys,
  translateValues,
} from '../src/core/i18n/markup.ts';
import type { Translate } from './i18n.ts';
import { escapeHtml } from './template.ts';

const PARSE_OPTIONS = { comment: true } as const;

function withAttribute(root: HTMLElement, attribute: string): [HTMLElement, string][] {
  return root
    .querySelectorAll(`[${attribute}]`)
    .map((element) => [element, element.getAttribute(attribute) ?? '']);
}

function translateText(element: HTMLElement, key: string, translate: Translate): string {
  const spec = element.getAttribute(VALUES_ATTRIBUTE) ?? '';
  return translate(
    key,
    translateValues(spec, (name) => translate(name)),
  );
}

export function translateHtml(html: string, translate: Translate): string {
  const root = parse(html, PARSE_OPTIONS);
  for (const [element, key] of withAttribute(root, TEXT_ATTRIBUTE)) {
    element.set_content(escapeHtml(translateText(element, key, translate)));
  }
  for (const [element, key] of withAttribute(root, HTML_ATTRIBUTE)) {
    element.set_content(translate(key));
  }
  for (const [element, spec] of withAttribute(root, ATTRIBUTES_ATTRIBUTE)) {
    for (const [attribute, key] of parseAttributeKeys(spec)) {
      element.setAttribute(attribute, escapeHtml(translate(key)));
    }
  }
  return root.toString();
}
