import { requireElement } from '@core/ui/dom';
import type { PresetId } from '../ids';

export function chapterOf(root: ParentNode, preset: PresetId): HTMLElement {
  return requireElement(root, `.chapter[data-preset="${preset}"]`);
}
