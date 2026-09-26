import type { HelicopterStore } from '../state';
import { mountCollectiveControl } from './collectiveControl';

export { CHAPTER_ACTIONS } from './actions';
export { HELICOPTER_CHOICES, VIEW_TOGGLES } from './dock';
export { HELICOPTER_READOUTS } from './readouts';

export function mountHelicopterUi(root: Document, store: HelicopterStore): void {
  mountCollectiveControl(root, store);
}
