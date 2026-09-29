import { escapeHtml, indent } from './template.ts';

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

const XML_INDENT = '  ';

export type XmlAttributes = Readonly<Record<string, string>>;

function openTag(name: string, attributes: XmlAttributes): string {
  const pairs = Object.entries(attributes).map(([key, value]) => ` ${key}="${escapeHtml(value)}"`);
  return `<${name}${pairs.join('')}`;
}

export function xmlElement(name: string, text: string, attributes: XmlAttributes = {}): string {
  return `${openTag(name, attributes)}>${escapeHtml(text)}</${name}>`;
}

export function xmlEmptyElement(name: string, attributes: XmlAttributes): string {
  return `${openTag(name, attributes)} />`;
}

export function xmlBlock(
  name: string,
  children: readonly string[],
  attributes: XmlAttributes = {},
): string {
  return [
    `${openTag(name, attributes)}>`,
    indent(children.join('\n'), XML_INDENT),
    `</${name}>`,
  ].join('\n');
}

export function xmlDocument(root: string): string {
  return [XML_DECLARATION, root, ''].join('\n');
}
