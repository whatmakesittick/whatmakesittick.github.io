const PLAY = '.dock [data-control="play"]';
const BACKGROUND = '.dock [data-control="reset-camera"]';
const CONTROL = '.dock .toggle, .dock [data-control="more"]';
const PLAY_GLYPH = '▶︎';
const PAUSE_GLYPH = '❚❚';
const SVG_NS = 'http://www.w3.org/2000/svg';
const COPIED = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'] as const;

function glyphFor(button: HTMLElement): string {
  return button.dataset.playing === 'true' ? PAUSE_GLYPH : PLAY_GLYPH;
}

export function applyTextGlyph(button: HTMLElement): MutationObserver | undefined {
  if (button.dataset.debug) return undefined;
  button.dataset.debug = 'text';
  const glyph = button.ownerDocument.createElement('span');
  glyph.setAttribute('aria-hidden', 'true');
  glyph.style.cssText = 'font-size:18px;line-height:1;pointer-events:none';
  glyph.textContent = glyphFor(button);
  button.replaceChildren(glyph);
  const view = button.ownerDocument.defaultView;
  if (!view) return undefined;
  const observer = new view.MutationObserver(() => {
    glyph.textContent = glyphFor(button);
  });
  observer.observe(button, { attributes: true, attributeFilter: ['data-playing'] });
  return observer;
}

export function svgDataUrl(icon: SVGSVGElement): string {
  const view = icon.ownerDocument.defaultView;
  const clone = icon.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  const style = view?.getComputedStyle(icon);
  const box = icon.getBoundingClientRect();
  clone.setAttribute('width', String(box.width || 20));
  clone.setAttribute('height', String(box.height || 20));
  for (const name of COPIED) {
    const value = style?.getPropertyValue(name);
    if (value) clone.setAttribute(name, value.replace('currentcolor', style?.color ?? 'black'));
  }
  return `url("data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}")`;
}

export function applyBackgroundIcon(button: HTMLElement): void {
  if (button.dataset.debug) return;
  const icon = button.querySelector('svg');
  if (!icon) return;
  button.dataset.debug = 'bg';
  const box = icon.getBoundingClientRect();
  const size = box.width ? `${box.width}px ${box.height}px` : '20px 20px';
  button.style.backgroundImage = svgDataUrl(icon);
  button.style.backgroundRepeat = 'no-repeat';
  button.style.backgroundPosition = 'center';
  button.style.backgroundSize = size;
  icon.style.display = 'none';
}

export function tagControl(button: HTMLElement): void {
  if (!button.dataset.debug) button.dataset.debug = 'control';
}

export function applyDockAb(doc: Document): string[] {
  const applied: string[] = [];
  const play = doc.querySelector<HTMLElement>(PLAY);
  if (play && !play.dataset.debug) {
    applyTextGlyph(play);
    applied.push('text');
  }
  const bg = doc.querySelector<HTMLElement>(BACKGROUND);
  if (bg && !bg.dataset.debug) {
    applyBackgroundIcon(bg);
    if (bg.dataset.debug) applied.push('bg');
  }
  const control = doc.querySelector<HTMLElement>(CONTROL);
  if (control && !control.dataset.debug) {
    tagControl(control);
    applied.push(`control ${control.dataset.control ?? control.className}`);
  }
  return applied;
}

export function watchDockAb(doc: Document, onApply: (applied: string[]) => void): () => void {
  const view = doc.defaultView;
  const run = () => {
    const applied = applyDockAb(doc);
    if (applied.length) onApply(applied);
  };
  run();
  if (!view) return () => {};
  let scheduled = false;
  const observer = new view.MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    view.setTimeout(() => {
      scheduled = false;
      run();
    }, 200);
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
