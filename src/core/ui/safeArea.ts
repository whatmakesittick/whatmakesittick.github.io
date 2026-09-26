const SAFE_AREA_PROPERTY = '--scene-safe-';
const STAGE_INSET_PROPERTY = '--stage-inset';

interface Overlay {
  element: Element;
  side: 'right' | 'bottom';
  extent: (rect: DOMRect) => number;
}

function stageInset(stage: HTMLElement): number {
  const value = parseFloat(getComputedStyle(stage).getPropertyValue(STAGE_INSET_PROPERTY));
  return Number.isFinite(value) ? value : 0;
}

export function mountSafeArea(root: Document): void {
  const scene = root.querySelector<HTMLElement>('#scene');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const dock = root.querySelector('[data-dock]');
  const gauge = root.querySelector('.gauge');
  if (!scene || !stage || !dock || !gauge) return;

  const overlays: Overlay[] = [
    { element: dock, side: 'bottom', extent: (rect) => rect.height },
    { element: gauge, side: 'right', extent: (rect) => rect.width },
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
