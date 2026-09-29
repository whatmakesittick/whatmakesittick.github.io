import type { Rect } from './labelLayout';

const STAGE_SELECTOR = '[data-stage]';
const KEEP_OUT_SELECTOR = '.stage-expand, [data-gauge], [data-dock]';
const EXPANDED_ATTRIBUTE = 'data-stage-expanded';

export function keepOutOverlays(container: HTMLElement): HTMLElement[] {
  const stage = container.closest<HTMLElement>(STAGE_SELECTOR);
  return stage ? Array.from(stage.querySelectorAll<HTMLElement>(KEEP_OUT_SELECTOR)) : [];
}

export function keepOutAreas(frame: DOMRectReadOnly, overlays: readonly Element[]): Rect[] {
  return overlays
    .map((overlay) => overlay.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0)
    .map((box) => ({
      left: box.left - frame.left,
      right: box.right - frame.left,
      top: box.top - frame.top,
      bottom: box.bottom - frame.top,
    }));
}

export function watchKeepOut(
  frame: HTMLElement,
  overlays: readonly HTMLElement[],
  onChange: (areas: Rect[]) => void,
): () => void {
  if (overlays.length === 0) return () => {};
  const measure = () => onChange(keepOutAreas(frame.getBoundingClientRect(), overlays));
  const resizes = new ResizeObserver(measure);
  [frame, ...overlays].forEach((element) => resizes.observe(element));
  const expansion = new MutationObserver(measure);
  expansion.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [EXPANDED_ATTRIBUTE],
  });
  return () => {
    resizes.disconnect();
    expansion.disconnect();
  };
}
