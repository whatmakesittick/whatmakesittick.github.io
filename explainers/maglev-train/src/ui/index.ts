import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { createLiveReader } from '../state';
import type { MaglevTrainStore } from '../state';
import { CENTRE_READOUTS } from './centreReadouts';
import { COMPARE_READOUTS } from './compareReadouts';
import { floatReadouts } from './floatReadouts';
import { motorReadouts } from './motorReadouts';
import { rideReadouts } from './rideReadouts';
import { stopReadouts } from './stopReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { MAGLEV_TRAIN_CHOICES, VIEW_TOGGLES } from './dock';
export { MAGLEV_TRAIN_READOUTS } from './readouts';

export function mountMaglevTrainUi(root: Document, store: MaglevTrainStore): Disposer {
  const read = createLiveReader();
  return mountLiveReadouts(root, store, {
    ...rideReadouts(read),
    ...floatReadouts(read),
    ...CENTRE_READOUTS,
    ...motorReadouts(read),
    ...stopReadouts(read),
    ...COMPARE_READOUTS,
  });
}
