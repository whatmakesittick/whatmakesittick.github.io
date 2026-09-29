import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { RaptorStore } from '../state';
import { mountAscentReadouts } from './ascentReadouts';
import { mountChamberReadouts } from './chamberReadouts';
import { mountEngineReadouts } from './engineReadouts';
import { mountHeightControl } from './heightControl';
import { mountOverviewReadouts } from './overviewReadouts';
import { mountPropellantReadouts } from './propellantReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { RAPTOR_CHOICES, VIEW_TOGGLES } from './dock';
export { RAPTOR_READOUTS } from './readouts';

export function mountRaptorUi(root: Document, store: RaptorStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountPropellantReadouts(root, store),
    mountEngineReadouts(root, store),
    mountChamberReadouts(root, store),
    mountHeightControl(root, store),
    mountAscentReadouts(root, store),
  ]);
}
