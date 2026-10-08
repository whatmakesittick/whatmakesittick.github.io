import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import {
  HUB_HEIGHT_M,
  ROTOR_RADIUS_M,
  TIP_HEIGHT_M,
  centrelineDeficit,
  wakeLoss,
  windAtHeight,
} from '../model';
import { liveReading } from '../state';
import type { WindFarmStore, WindFarmStoreState } from '../state';
import { formatLossPercent, formatPercent, formatSpacing, formatWind } from './format';

const BOTTOM_TIP_HEIGHT_M = HUB_HEIGHT_M - ROTOR_RADIUS_M;

function farmWakeLoss(state: WindFarmStoreState): number {
  const { wind, fromDeg, operating } = liveReading(state);
  return operating.producing ? wakeLoss(wind, fromDeg, state.spacing) : 0;
}

export function mountWakesReadouts(root: Document, store: WindFarmStore): Disposer {
  return mountLiveReadouts(root, store, {
    wakeSpacing: (state) => formatSpacing(state.spacing),
    wakeDeficit: (state) =>
      formatPercent(centrelineDeficit(liveReading(state).thrust, state.spacing)),
    wakeLoss: (state) => formatLossPercent(farmWakeLoss(state)),
    windTop: (state) => formatWind(windAtHeight(liveReading(state).wind, TIP_HEIGHT_M)),
    windBottom: (state) => formatWind(windAtHeight(liveReading(state).wind, BOTTOM_TIP_HEIGHT_M)),
  });
}
