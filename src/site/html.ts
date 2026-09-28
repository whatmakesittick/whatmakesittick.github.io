export interface Markup {
  readonly html: string;
}

type AttributeValue = string | number | boolean | undefined;
type Child = Markup | string;

const VOID_ELEMENTS: ReadonlySet<string> = new Set(['img']);
const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}

function renderAttribute([name, value]: [string, AttributeValue]): string {
  if (value === undefined || value === false) return '';
  return value === true ? ` ${name}` : ` ${name}="${escapeHtml(String(value))}"`;
}

function renderChild(child: Child): string {
  return typeof child === 'string' ? escapeHtml(child) : child.html;
}

export function element(
  tag: string,
  attributes: Readonly<Record<string, AttributeValue>> = {},
  children: readonly Child[] = [],
): Markup {
  const open = `<${tag}${Object.entries(attributes).map(renderAttribute).join('')}>`;
  if (VOID_ELEMENTS.has(tag)) return { html: open };
  return { html: `${open}${children.map(renderChild).join('')}</${tag}>` };
}
