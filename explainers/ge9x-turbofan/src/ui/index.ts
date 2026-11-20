import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { EngineStore } from '../state';
import { mountReverse } from './mountReverse';
import { mountTurbines } from './mountTurbines';

export { CHAPTER_ACTIONS } from './actions';
export { ENGINE_CHOICES, ENGINE_SHORTCUTS, VIEW_TOGGLES } from './dock';
export { mountThrustLever } from './mountThrustLever';
export { ENGINE_READOUTS } from './readouts';

export function mountEngineUi(root: Document, store: EngineStore): Disposer {
  return disposeAll([mountTurbines(root, store), mountReverse(root, store)]);
}
