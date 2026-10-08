import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { WindFarmStore } from '../state';
import { mountCurveReadouts } from './mountCurveReadouts';
import { mountFarmReadouts } from './mountFarmReadouts';
import { mountGridReadouts } from './mountGridReadouts';
import { mountNacelleReadouts } from './mountNacelleReadouts';
import { mountTowerReadouts } from './mountTowerReadouts';
import { mountWakesReadouts } from './mountWakesReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { VIEW_TOGGLES, WIND_FARM_CHOICES } from './dock';
export { WIND_FARM_READOUTS } from './readouts';

export function mountWindFarmUi(root: Document, store: WindFarmStore): Disposer {
  return disposeAll([
    mountFarmReadouts(root, store),
    mountTowerReadouts(root, store),
    mountNacelleReadouts(root, store),
    mountCurveReadouts(root, store),
    mountWakesReadouts(root, store),
    mountGridReadouts(root, store),
  ]);
}
