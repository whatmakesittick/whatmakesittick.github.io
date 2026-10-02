import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { missionShareAt } from '../model';
import { missionAt } from '../state';
import type { ReaperStore } from '../state';
import { formatFuelKg, formatLinkMode, formatPercent } from './format';

export function mountOverviewReadouts(root: Document, store: ReaperStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-link': (state) => formatLinkMode(missionAt(state).link),
    'overview-fuel': (state) => formatFuelKg(missionAt(state).fuel.kg),
    'overview-done': (state) => formatPercent(missionShareAt(state.phase)),
  });
}
