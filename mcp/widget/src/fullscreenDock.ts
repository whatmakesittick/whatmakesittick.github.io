import compactCss from '../../../src/core/styles/controls-compact.css?inline';
import { EMBED_DOM } from '../../../src/core/embed/contract.ts';

export const SITE_COMPACT_MAX_WIDTH = 899;

export function fullscreenDockCss(css = compactCss): string {
  const scope = `.wmit.is-fs .dock-slot[${EMBED_DOM.uiAttr}]`;
  return `@media (max-width: ${SITE_COMPACT_MAX_WIDTH}px){${scope}{${css}}}`;
}
