import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { DataCenterStore } from '../state';
import { BUILDING_READOUTS } from './buildingReadouts';
import { COMPARE_READOUTS } from './compareReadouts';
import { HEAT_OUT_READOUTS } from './heatOutReadouts';
import { NETWORK_READOUTS } from './networkReadouts';
import { POWER_IN_READOUTS } from './powerInReadouts';
import { RACK_READOUTS } from './rackReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { DATA_CENTER_CHOICES, VIEW_TOGGLES } from './dock';
export { DATA_CENTER_READOUTS } from './readouts';

export function mountDataCenterUi(root: Document, store: DataCenterStore): Disposer {
  return mountLiveReadouts(root, store, {
    ...BUILDING_READOUTS,
    ...POWER_IN_READOUTS,
    ...RACK_READOUTS,
    ...NETWORK_READOUTS,
    ...HEAT_OUT_READOUTS,
    ...COMPARE_READOUTS,
  });
}
