import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { ChainsawStore } from '../state';
import { mountChainReadouts } from './mountChainReadouts';
import { mountClutchReadouts } from './mountClutchReadouts';
import { mountEngineReadouts } from './mountEngineReadouts';
import { mountFuelReadouts } from './mountFuelReadouts';
import { mountKickbackReadouts } from './mountKickbackReadouts';
import { mountSawReadouts } from './mountSawReadouts';
import { mountStartingReadouts } from './mountStartingReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { CHAINSAW_CHOICES, VIEW_TOGGLES } from './dock';
export { CHAINSAW_READOUTS } from './readouts';

export function mountChainsawUi(root: Document, store: ChainsawStore): Disposer {
  return disposeAll([
    mountSawReadouts(root, store),
    mountEngineReadouts(root, store),
    mountFuelReadouts(root, store),
    mountStartingReadouts(root, store),
    mountClutchReadouts(root, store),
    mountChainReadouts(root, store),
    mountKickbackReadouts(root, store),
  ]);
}
