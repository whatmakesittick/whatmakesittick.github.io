import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { NavalDroneStore } from '../state';
import { formatCarries, formatCost, formatShipValue } from './format';

export function mountFleetReadouts(root: Document, store: NavalDroneStore): Disposer {
  return mountLiveReadouts(root, store, {
    'fleet-carries': (state) => formatCarries(state.fit),
    'fleet-cost': () => formatCost(),
    'fleet-ship': () => formatShipValue(),
  });
}
