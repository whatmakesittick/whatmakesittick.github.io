import type { ComponentChildren } from 'preact';

function convert(node: Node, key: number): ComponentChildren {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const children = Array.from(node.childNodes, convert);
  const tag = (node as Element).tagName;
  if (tag === 'STRONG' || tag === 'B') return <strong key={key}>{children}</strong>;
  if (tag === 'EM' || tag === 'I') return <em key={key}>{children}</em>;
  return children;
}

export function RichText({ html }: { html: string }) {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return <>{Array.from(body.childNodes, convert)}</>;
}
