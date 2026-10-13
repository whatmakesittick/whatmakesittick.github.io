import type { Explainer, ExplainerStore, Playback } from '../explainer';
import { onLanguageChanged } from '../i18n';
import { translateDom } from '../i18n/dom';
import dockMarkup from '../partials/dock.html?raw';
import gaugeMarkup from '../partials/gauge.html?raw';
import type { GaugeSide } from '../scene/lens';
import { mountDock } from '../ui/dock';
import { disposeAll } from '../ui/disposers';
import type { Disposer } from '../ui/disposers';
import { mountReadouts } from '../ui/readouts';
import { EMBED_DOM } from './contract';
import type { EmbedUiMounted, EmbedUiSlots } from './contract';

const LANGUAGE_SELECT = '[data-language-select]';
const PHASE_MIN_WIDTH = '--phase-min-width';
const GAUGE_SELECTOR = `[${EMBED_DOM.gaugeAttr}]`;

export interface EmbedControls {
  mounted: EmbedUiMounted;
  watchSafeArea(scene: HTMLElement, gaugeSide?: GaugeSide): void;
  dispose(): void;
}

function fill(slot: HTMLElement, markup: string): void {
  slot.innerHTML = markup;
  slot.querySelectorAll(LANGUAGE_SELECT).forEach((element) => element.remove());
  slot.setAttribute(EMBED_DOM.uiAttr, '');
}

function clear(slot: HTMLElement): void {
  slot.replaceChildren();
  slot.removeAttribute(EMBED_DOM.uiAttr);
}

function mountInto(
  slot: HTMLElement | undefined,
  markup: string,
  bind: (root: HTMLElement) => Disposer,
): Disposer | undefined {
  if (!slot) return undefined;
  try {
    fill(slot, markup);
    const unbind = bind(slot);
    translateDom(slot);
    const unwatch = onLanguageChanged(() => translateDom(slot));
    return () => {
      unwatch();
      unbind();
      clear(slot);
    };
  } catch (error) {
    console.warn('The embed could not mount its controls', error);
    clear(slot);
    return undefined;
  }
}

export function fitPhaseButtons(dock: HTMLElement): Disposer {
  const group = dock.querySelector<HTMLElement>('[data-phase-buttons]');
  const area = group?.parentElement;
  if (!group || !area) return () => {};
  const fit = () => {
    group.style.removeProperty(PHASE_MIN_WIDTH);
    const width = area.clientWidth;
    const count = group.children.length;
    if (width <= 0 || count === 0 || group.scrollWidth <= width + 1) return;
    const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
    group.style.setProperty(
      PHASE_MIN_WIDTH,
      `${Math.floor((width - gap * (count - 1)) / count)}px`,
    );
  };
  const observer = new ResizeObserver(fit);
  observer.observe(area);
  return () => observer.disconnect();
}

function mountGauge<S extends Playback>(
  root: HTMLElement,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
): Disposer {
  const unmountReadouts = mountReadouts(root, store, explainer.readouts);
  const gauge = root.querySelector<HTMLElement>(GAUGE_SELECTOR);
  const unmountPanel = gauge ? explainer.mountGauge?.(gauge, store) : undefined;
  return disposeAll([unmountPanel ?? (() => {}), unmountReadouts]);
}

function overlaps(box: DOMRect, rect: DOMRect | undefined): rect is DOMRect {
  return (
    rect !== undefined &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < box.bottom &&
    rect.bottom > box.top &&
    rect.left < box.right &&
    rect.right > box.left
  );
}

function watchOverlays(
  scene: HTMLElement,
  dock: HTMLElement | null,
  gauge: HTMLElement | null,
  gaugeSide: GaugeSide,
): Disposer {
  const set = (side: string, pixels: number) => {
    const value = `${Math.max(0, Math.round(pixels))}px`;
    const property = `${EMBED_DOM.safeAreaPrefix}${side}`;
    if (scene.style.getPropertyValue(property) !== value) scene.style.setProperty(property, value);
  };
  const apply = () => {
    const box = scene.getBoundingClientRect();
    const dockBox = dock?.getBoundingClientRect();
    const gaugeBox = gauge?.getBoundingClientRect();
    set('bottom', overlaps(box, dockBox) ? box.bottom - dockBox.top : 0);
    set('right', gaugeSide === 'right' && overlaps(box, gaugeBox) ? box.right - gaugeBox.left : 0);
    set('top', gaugeSide === 'top' && overlaps(box, gaugeBox) ? gaugeBox.bottom - box.top : 0);
  };
  const resizes = new ResizeObserver(apply);
  [scene, dock, gauge].forEach((element) => element && resizes.observe(element));
  const expansion = new MutationObserver(apply);
  expansion.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-stage-expanded'],
  });
  apply();
  return () => {
    resizes.disconnect();
    expansion.disconnect();
  };
}

export function mountEmbedControls<S extends Playback>(
  slots: EmbedUiSlots,
  store: ExplainerStore<S>,
  explainer: Explainer<S>,
): EmbedControls {
  const unmountDock = mountInto(slots.dock, dockMarkup, (root) =>
    mountDock(root, store, explainer),
  );
  const unmountGauge =
    explainer.readouts.length > 0 || explainer.mountGauge
      ? mountInto(slots.gauge, gaugeMarkup, (root) => mountGauge(root, store, explainer))
      : undefined;
  const dock = unmountDock ? (slots.dock?.querySelector<HTMLElement>('[data-dock]') ?? null) : null;
  const gauge = unmountGauge
    ? (slots.gauge?.querySelector<HTMLElement>(GAUGE_SELECTOR) ?? null)
    : null;
  const disposers: Disposer[] = [];
  if (dock) disposers.push(fitPhaseButtons(dock));

  return {
    mounted: { dock: dock !== null, gauge: gauge !== null },
    watchSafeArea(scene, gaugeSide = 'right') {
      if (dock || gauge) disposers.push(watchOverlays(scene, dock, gauge, gaugeSide));
    },
    dispose: disposeAll([
      () => disposers.forEach((dispose) => dispose()),
      unmountDock ?? (() => {}),
      unmountGauge ?? (() => {}),
    ]),
  };
}
