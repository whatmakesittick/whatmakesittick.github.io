import type { JSX } from 'preact';

const stroke = (d: JSX.Element) => (
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    {d}
  </svg>
);

export const Icon = {
  play: () => (
    <svg class="icon fill" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.4-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7Z" />
    </svg>
  ),
  pause: () => (
    <svg class="icon fill" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4.2" height="14" rx="1.2" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.2" />
    </svg>
  ),
  expand: () => stroke(<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />),
  collapse: () => stroke(<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />),
  prev: () => stroke(<path d="m15 6-6 6 6 6" />),
  next: () => stroke(<path d="m9 6 6 6-6 6" />),
  ext: () =>
    stroke(
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    ),
  reset: () => stroke(<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />),
  close: () => stroke(<path d="M6 6l12 12M18 6 6 18" />),
  grid: () =>
    stroke(
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>,
    ),
  brand: () => (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0b0d10" />
      <g transform="translate(-0.4 -3.74) scale(0.54)">
        <circle cx="17" cy="37" r="8" fill="none" stroke="#f5a524" stroke-width="4" />
        <circle cx="17" cy="37" r="2.2" fill="#f5a524" />
        <path
          d="M20.6 45.2 L30.8 59.7 L53 14.6 L51 13.4 L29.2 44.3 L24.4 41.8 Z"
          fill="#f5a524"
          stroke="#f5a524"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  ),
};

const SHAPES = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g']);
const ATTRS =
  /^(d|cx|cy|r|rx|ry|x|y|x1|y1|x2|y2|width|height|points|transform|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|opacity)$/;

interface Shape {
  tag: string;
  attrs: Record<string, string>;
  children: Shape[];
}
const iconCache = new Map<string, Shape[]>();

function parseShapes(parent: Element): Shape[] {
  return Array.from(parent.children)
    .filter((el) => SHAPES.has(el.localName))
    .map((el) => {
      const attrs: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) if (ATTRS.test(a.name)) attrs[a.name] = a.value;
      return { tag: el.localName, attrs, children: parseShapes(el) };
    });
}

const render = (list: Shape[]): JSX.Element[] =>
  list.map((s, i) => {
    const Tag = s.tag as 'path';
    return (
      <Tag key={i} {...s.attrs}>
        {render(s.children)}
      </Tag>
    );
  });

export function ToggleIcon({ markup }: { markup: string }) {
  let list = iconCache.get(markup);
  if (!list) {
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
      'image/svg+xml',
    );
    list = doc.querySelector('parsererror') ? [] : parseShapes(doc.documentElement);
    iconCache.set(markup, list);
  }
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      {render(list)}
    </svg>
  );
}
