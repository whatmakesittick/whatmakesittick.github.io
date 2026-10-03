import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { NavalDroneStore } from '../state';
import { mountFleetReadouts } from './mountFleetReadouts';
import { mountHorizonControl } from './mountHorizonControl';
import { mountHullControl } from './mountHullControl';
import { mountJetControl } from './mountJetControl';
import { mountLinkControl } from './mountLinkControl';
import { mountOverviewReadouts } from './mountOverviewReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { NAVAL_DRONE_CHOICES, VIEW_TOGGLES } from './dock';
export { NAVAL_DRONE_READOUTS } from './readouts';

export function mountNavalDroneUi(root: Document, store: NavalDroneStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountHullControl(root, store),
    mountJetControl(root, store),
    mountLinkControl(root, store),
    mountHorizonControl(root, store),
    mountFleetReadouts(root, store),
  ]);
}
