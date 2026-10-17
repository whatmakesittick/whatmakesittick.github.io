import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { ThrusterCarStore } from '../state';
import { mountBoostReadouts } from './mountBoostReadouts';
import { mountFlipReadouts } from './mountFlipReadouts';
import { mountHopReadouts } from './mountHopReadouts';
import { mountLimitsReadouts } from './mountLimitsReadouts';
import { mountNozzleReadouts } from './mountNozzleReadouts';
import { mountTankReadouts } from './mountTankReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { THRUSTER_CAR_CHOICES, VIEW_TOGGLES } from './dock';
export { THRUSTER_CAR_READOUTS } from './readouts';

export function mountThrusterCarUi(root: Document, store: ThrusterCarStore): Disposer {
  return disposeAll([
    mountTankReadouts(root, store),
    mountNozzleReadouts(root, store),
    mountBoostReadouts(root, store),
    mountHopReadouts(root, store),
    mountFlipReadouts(root, store),
    mountLimitsReadouts(root, store),
  ]);
}
