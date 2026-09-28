import { requireElement } from '@core/ui/dom';

export function readoutElement(root: ParentNode, id: string): HTMLElement {
  return requireElement(root, `[data-readout="${id}"]`);
}
