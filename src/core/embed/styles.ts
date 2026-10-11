import sceneCss from '../scene/scene.css?inline';
import controlsCss from '../styles/controls.css?inline';
import compactCss from '../styles/controls-compact.css?inline';
import touchCss from '../styles/controls-touch.css?inline';
import primitivesCss from '../styles/primitives.css?inline';
import tokensCss from '../styles/tokens.css?inline';
import { DOCK_COMPACT_MAX_WIDTH, EMBED_DOM } from './contract';

const CORE_STYLES = 'core';
const NARROW_STAGE_MAX_WIDTH = 620;

export function scopedControlsCss(
  scope = `[${EMBED_DOM.uiAttr}]`,
  css = {
    tokens: tokensCss,
    primitives: primitivesCss,
    controls: controlsCss,
    compact: compactCss,
    touch: touchCss,
  },
): string {
  const compact = `@container ${EMBED_DOM.dockContainer} (max-width: ${DOCK_COMPACT_MAX_WIDTH}px){${css.compact}}`;
  const touch = `@media (pointer: coarse){${css.touch}}`;
  const narrow = `@container (max-width: ${NARROW_STAGE_MAX_WIDTH}px){.gauge{display:none}}`;
  const tokens = css.tokens.replaceAll(':root', '&');
  return `${scope}{${tokens}${css.primitives}${css.controls}${narrow}${compact}${touch}}`;
}

function appendStyle(name: string, css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.setAttribute(EMBED_DOM.styleAttr, name);
  style.textContent = css;
  document.head.append(style);
  return style;
}

let coreStyle: HTMLStyleElement | undefined;
let coreUsers = 0;

export function attachStyles(slug: string, explainerCss: string): () => void {
  coreUsers += 1;
  if (!coreStyle?.isConnected) {
    coreStyle?.remove();
    coreStyle = appendStyle(CORE_STYLES, `${sceneCss}\n${scopedControlsCss()}`);
  }
  const own = appendStyle(slug, explainerCss);
  let attached = true;
  return () => {
    if (!attached) return;
    attached = false;
    own.remove();
    coreUsers -= 1;
    if (coreUsers > 0) return;
    coreStyle?.remove();
    coreStyle = undefined;
  };
}
