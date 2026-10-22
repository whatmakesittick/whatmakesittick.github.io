import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { MaglevTrainStore } from '../state';
import { mountCentreReadouts } from './mountCentreReadouts';
import { mountCompareReadouts } from './mountCompareReadouts';
import { mountFloatReadouts } from './mountFloatReadouts';
import { mountMotorReadouts } from './mountMotorReadouts';
import { mountRideReadouts } from './mountRideReadouts';
import { mountStopReadouts } from './mountStopReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { MAGLEV_TRAIN_CHOICES, VIEW_TOGGLES } from './dock';
export { MAGLEV_TRAIN_READOUTS } from './readouts';

export function mountMaglevTrainUi(root: Document, store: MaglevTrainStore): Disposer {
  return disposeAll([
    mountRideReadouts(root, store),
    mountFloatReadouts(root, store),
    mountCentreReadouts(root, store),
    mountMotorReadouts(root, store),
    mountStopReadouts(root, store),
    mountCompareReadouts(root, store),
  ]);
}
