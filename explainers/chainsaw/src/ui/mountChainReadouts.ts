import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { liveReading } from '../state';
import type { ChainsawStore } from '../state';
import { formatCuttersPerSecond, formatSpeedPair } from './format';

export function mountChainReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    chainSpeed: (state) => formatSpeedPair(liveReading(state).chainSpeed),
    cuttersPerSecond: (state) => formatCuttersPerSecond(liveReading(state).chainSpeed),
  });
}
