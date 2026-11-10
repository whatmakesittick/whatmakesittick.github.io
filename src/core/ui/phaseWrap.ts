import type { Disposer } from './disposers';
import { requireElement } from './dom';

const WRAP_ATTRIBUTE = 'data-wrap';

export function wrapPhaseButtons(root: ParentNode): Disposer {
  const group = requireElement(root, '[data-phase-buttons]');
  const area = group.parentElement ?? group;
  const fit = () => {
    group.removeAttribute(WRAP_ATTRIBUTE);
    const width = area.clientWidth;
    if (width > 0 && group.scrollWidth > width + 1) group.setAttribute(WRAP_ATTRIBUTE, '');
  };
  const observer = new ResizeObserver(fit);
  observer.observe(area);
  for (const button of group.children) observer.observe(button);
  return () => observer.disconnect();
}
