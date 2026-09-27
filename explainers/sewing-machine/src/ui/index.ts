import type { SewingStore } from '../state';
import { mountStitchControl } from './stitchControl';
import { mountTensionResult } from './tensionResult';

export { CHAPTER_ACTIONS } from './actions';
export { SEWING_CHOICES, VIEW_TOGGLES } from './dock';
export { SEWING_READOUTS } from './readouts';

export function mountSewingUi(root: Document, store: SewingStore): void {
  mountTensionResult(root, store);
  mountStitchControl(root, store);
}
