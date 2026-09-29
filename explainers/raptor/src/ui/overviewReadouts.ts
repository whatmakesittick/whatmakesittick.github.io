import type { Disposer } from '@core/ui/disposers';
import { boosterThrustTf, thrustToWeight } from '../model/performance';
import { performanceOf } from '../state';
import type { RaptorStore } from '../state';
import { formatKg, formatTimes, formatTonnes } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountOverviewReadouts(root: Document, store: RaptorStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-burn': (state) => formatKg(performanceOf(state).massFlow),
    'overview-lift': (state) => formatTimes(thrustToWeight(performanceOf(state).thrustTf)),
    'overview-booster': (state) => formatTonnes(boosterThrustTf(performanceOf(state).thrustTf)),
  });
}
