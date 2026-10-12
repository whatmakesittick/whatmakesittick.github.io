export const GAUGE_DOCK_GAP = 8;
export const GAUGE_CLASH_ATTR = 'data-gauge-clash';

const GAUGE = '.gauge-slot .gauge';
const DOCK = '.dock-slot .dock';
const SLOTS = '.gauge-slot, .dock-slot';

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export function gaugeClearsDock(gauge: Box, dock: Box, gap = GAUGE_DOCK_GAP): boolean {
  if (gauge.height === 0 || dock.height === 0) return true;
  if (gauge.left >= dock.right || gauge.right <= dock.left) return true;
  return gauge.bottom <= dock.top - gap;
}

export function watchGaugeClearance(stage: HTMLElement): () => void {
  const sizes = new ResizeObserver(() => apply());
  const watched = new Set<Element>();
  function apply() {
    const gauge = stage.querySelector(GAUGE);
    const dock = stage.querySelector(DOCK);
    for (const element of [gauge, dock]) {
      if (element && !watched.has(element)) {
        watched.add(element);
        sizes.observe(element);
      }
    }
    const clash =
      gauge !== null &&
      dock !== null &&
      !gaugeClearsDock(gauge.getBoundingClientRect(), dock.getBoundingClientRect());
    if (stage.hasAttribute(GAUGE_CLASH_ATTR) !== clash)
      stage.toggleAttribute(GAUGE_CLASH_ATTR, clash);
  }
  const mounts = new MutationObserver(() => apply());
  stage
    .querySelectorAll(SLOTS)
    .forEach((slot) => mounts.observe(slot, { childList: true, attributes: true }));
  sizes.observe(stage);
  apply();
  return () => {
    sizes.disconnect();
    mounts.disconnect();
  };
}
