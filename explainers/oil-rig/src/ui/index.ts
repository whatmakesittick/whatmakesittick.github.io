import type { OilRigStore } from '../state';
import { mountDepletionControl } from './depletionControl';
import { mountDepthPicker } from './depthPicker';
import { mountDraftControl } from './draftControl';
import { mountMudControl } from './mudControl';
import { mountRockReadouts } from './rockReadouts';
import { mountSectionReadouts } from './sectionReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { OIL_RIG_CHOICES, VIEW_TOGGLES } from './dock';
export { OIL_RIG_READOUTS } from './readouts';

export function mountOilRigUi(root: Document, store: OilRigStore): void {
  mountDraftControl(root, store);
  mountDepthPicker(root, store);
  mountSectionReadouts(root, store);
  mountMudControl(root, store);
  mountRockReadouts(root, store);
  mountDepletionControl(root, store);
}
