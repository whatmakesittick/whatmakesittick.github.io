type AttributeValue = string | number | boolean | undefined;
export type Attributes = Record<string, AttributeValue>;
type Child = Node | string;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function requireElement<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}

export function queryAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function setAttributes(element: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) element.removeAttribute(name);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: Child[] = [],
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  setAttributes(element, attributes);
  element.append(...children);
  return element;
}

export function html<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  setAttributes(element, attributes);
  element.append(...children);
  return element;
}

export function setText(element: Element, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export function setPressed(element: Element, pressed: boolean): void {
  element.setAttribute('aria-pressed', String(pressed));
}
