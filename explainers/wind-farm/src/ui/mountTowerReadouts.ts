import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { BLADE_LENGTH_M, TIP_HEIGHT_M } from '../model';
import { liveReading } from '../state';
import type { WindFarmStore, WindFarmStoreState } from '../state';
import { formatMetres, formatRpm, formatSweptArea, formatTipSpeed, formatTurnTime } from './format';
import { mountWindOverride } from './mountWindOverride';

const TOWER_WIND_INPUT = 'tower-wind';
const BLADE_DIGITS = 1;

function rpmOf(state: WindFarmStoreState): number {
  return liveReading(state).operating.rpm;
}

export function mountTowerReadouts(root: Document, store: WindFarmStore): Disposer {
  return disposeAll([
    mountWindOverride(root, store, TOWER_WIND_INPUT),
    mountLiveReadouts(root, store, {
      rotorRpm: (state) => formatRpm(rpmOf(state)),
      turnTime: (state) => formatTurnTime(rpmOf(state)),
      tipSpeed: (state) => formatTipSpeed(rpmOf(state)),
      tipHeight: () => formatMetres(TIP_HEIGHT_M),
      bladeLength: () => formatMetres(BLADE_LENGTH_M, BLADE_DIGITS),
      sweptArea: () => formatSweptArea(),
    }),
  ]);
}
