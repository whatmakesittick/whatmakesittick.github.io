import type { JSX } from 'preact';

const stroke = (d: JSX.Element, name?: string) => (
  <svg class={name ? `icon ${name}` : 'icon'} viewBox="0 0 24 24" aria-hidden="true">
    {d}
  </svg>
);

export const Icon = {
  expand: () => stroke(<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />, 'icon-expand'),
  collapse: () => stroke(<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />, 'icon-collapse'),
  prev: () => stroke(<path d="m15 6-6 6 6 6" />),
  next: () => stroke(<path d="m9 6 6 6-6 6" />),
  ext: () =>
    stroke(
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    ),
  reset: () => stroke(<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />),
};
