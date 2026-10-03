import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { sortieShareAt } from '../model';
import { sortieAt } from '../state';
import type { FpvStore } from '../state';
import { formatBattery, formatMetres, formatPercent } from './format';

export function mountOverviewReadouts(root: Document, store: FpvStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-battery': (state) => formatBattery(sortieAt(state).battery),
    'overview-distance': (state) => formatMetres(sortieAt(state).link.distance),
    'overview-done': (state) => formatPercent(sortieShareAt(state.phase)),
  });
}
