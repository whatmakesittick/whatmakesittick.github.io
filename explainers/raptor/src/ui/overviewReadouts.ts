import type { Disposer } from '@core/ui/disposers';
import { boosterThrustTf, thrustToWeight } from '../model/performance';
import { performanceOf } from '../state';
import type { RaptorStore } from '../state';
import { formatKg, formatTimes, formatTonnes, unlessOff } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountOverviewReadouts(root: Document, store: RaptorStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-burn': (state) => {
      const { firing, massFlow } = performanceOf(state);
      return unlessOff(firing, () => formatKg(massFlow));
    },
    'overview-lift': (state) => {
      const { firing, thrustTf } = performanceOf(state);
      return unlessOff(firing, () => formatTimes(thrustToWeight(thrustTf)));
    },
    'overview-booster': (state) => {
      const { firing, thrustTf } = performanceOf(state);
      return unlessOff(firing, () => formatTonnes(boosterThrustTf(thrustTf)));
    },
  });
}
