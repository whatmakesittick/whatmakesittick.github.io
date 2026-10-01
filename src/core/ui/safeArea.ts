import type { GaugeSide } from '../scene/lens';

const SAFE_AREA_PROPERTY = '--scene-safe-';
const STAGE_INSET_PROPERTY = '--stage-inset';

interface Overlay {
  element: Element;
  side: GaugeSide | 'bottom';
  extent: (rect: DOMRect) => number;
}

function stageInset(stage: HTMLElement): number {
  const value = parseFloat(getComputedStyle(stage).getPropertyValue(STAGE_INSET_PROPERTY));
  return Number.isFinite(value) ? value : 0;
}

function gaugeOverlay(gauge: Element, stage: HTMLElement, side: GaugeSide): Overlay {
  if (side === 'right') return { element: gauge, side, extent: (rect) => rect.width };
  return {
    element: gauge,
    side,
    extent: (rect) => Math.max(0, rect.bottom - stage.getBoundingClientRect().top),
  };
}

export function mountSafeArea(root: Document, gaugeSide: GaugeSide = 'right'): void {
  const scene = root.querySelector<HTMLElement>('#scene');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const dock = root.querySelector('[data-dock]');
  const gauge = root.querySelector('.gauge');
  if (!scene || !stage || !dock || !gauge) return;

  const overlays: Overlay[] = [
    { element: dock, side: 'bottom', extent: (rect) => rect.height },
    gaugeOverlay(gauge, stage, gaugeSide),
  ];

  const apply = () => {
    const inset = stageInset(stage);
    for (const { element, side, extent } of overlays) {
      const value = extent(element.getBoundingClientRect()) + inset;
      scene.style.setProperty(`${SAFE_AREA_PROPERTY}${side}`, `${Math.round(value)}px`);
    }
  };

  const observer = new ResizeObserver(apply);
  overlays.forEach(({ element }) => observer.observe(element));
  apply();
}
