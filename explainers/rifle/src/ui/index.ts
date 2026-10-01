import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { RifleStore } from '../state';
import { mountCartridgeReadouts } from './mountCartridgeReadouts';
import { mountFiringReadouts } from './mountFiringReadouts';
import { mountGasReadouts } from './mountGasReadouts';
import { mountOverviewReadouts } from './mountOverviewReadouts';
import { mountReloadReadouts } from './mountReloadReadouts';
import { mountTravelControl } from './mountTravelControl';

export { CHAPTER_ACTIONS } from './actions';
export { RIFLE_CHOICES, VIEW_TOGGLES } from './dock';
export { RIFLE_READOUTS } from './readouts';

export function mountRifleUi(root: Document, store: RifleStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountCartridgeReadouts(root, store),
    mountFiringReadouts(root, store),
    mountTravelControl(root, store),
    mountGasReadouts(root, store),
    mountReloadReadouts(root, store),
  ]);
}
