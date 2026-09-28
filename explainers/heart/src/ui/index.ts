import type { HeartStore } from '../state';
import { mountChamberReadouts } from './chamberReadouts';
import { mountConductionReadouts } from './conductionReadouts';
import { mountCycleReadouts } from './cycleReadouts';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { mountEffortControl } from './effortControl';
import { mountValveReadouts } from './valveReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { HEART_CHOICES, VIEW_TOGGLES } from './dock';
export { HEART_READOUTS } from './readouts';

export function mountHeartUi(root: Document, store: HeartStore): Disposer {
  return disposeAll([
    mountChamberReadouts(root, store),
    mountValveReadouts(root, store),
    mountCycleReadouts(root, store),
    mountConductionReadouts(root, store),
    mountEffortControl(root, store),
  ]);
}
