import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { RUN_SECONDS, distanceAt } from '../model';
import { runAt } from '../state';
import type { NavalDroneStore } from '../state';
import { formatDistance, formatMode, formatPercent } from './format';

export function mountOverviewReadouts(root: Document, store: NavalDroneStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-mode': (state) => formatMode(runAt(state).planing.mode),
    'overview-covered': (state) => formatDistance(distanceAt(state.phase)),
    'overview-done': (state) => formatPercent(state.phase / RUN_SECONDS),
  });
}
