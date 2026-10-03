import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { FpvStore } from '../state';
import { mountFlightReadouts } from './mountFlightReadouts';
import { mountGogglesFeed } from './mountGogglesFeed';
import { mountLimitsReadouts } from './mountLimitsReadouts';
import { mountLinkReadouts } from './mountLinkReadouts';
import { mountModeReadouts } from './mountModeReadouts';
import { mountOverviewReadouts } from './mountOverviewReadouts';
import { mountPayloadControl } from './mountPayloadControl';
import { mountPowerReadouts } from './mountPowerReadouts';
import { mountTiltControl } from './mountTiltControl';

export { CHAPTER_ACTIONS } from './actions';
export { FPV_CHOICES, VIEW_TOGGLES } from './dock';
export { FPV_READOUTS } from './readouts';

export function mountFpvUi(root: Document, store: FpvStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountFlightReadouts(root, store),
    mountTiltControl(root, store),
    mountModeReadouts(root, store),
    mountLinkReadouts(root, store),
    mountPayloadControl(root, store),
    mountPowerReadouts(root, store),
    mountLimitsReadouts(root, store),
    mountGogglesFeed(root, store),
  ]);
}
