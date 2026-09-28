import type { AtpSynthaseStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { mountEventReadouts } from './eventReadouts';
import { mountOxygenControl } from './oxygenControl';
import { mountRingReadouts } from './ringReadouts';
import { mountSeatReadouts } from './seatReadouts';
import { mountTrainingReadouts } from './trainingReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { ATP_SYNTHASE_CHOICES, VIEW_TOGGLES } from './dock';
export { ATP_SYNTHASE_READOUTS } from './readouts';

export function mountAtpSynthaseUi(root: Document, store: AtpSynthaseStore): Disposer {
  return disposeAll([
    mountOxygenControl(root, store),
    mountRingReadouts(root, store),
    mountSeatReadouts(root, store),
    mountEventReadouts(root, store),
    mountTrainingReadouts(root, store),
  ]);
}
