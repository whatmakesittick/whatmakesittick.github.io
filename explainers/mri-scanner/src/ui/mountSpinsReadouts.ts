import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { MriScannerStore } from '../state';
import { formatLarmorBand, formatSlowdown, formatSurplus, formatSurplusCount } from './format';

export function mountSpinsReadouts(root: Document, store: MriScannerStore): Disposer {
  return mountLiveReadouts(root, store, {
    larmor: (state) => formatLarmorBand(state.field),
    surplus: (state) => formatSurplus(state.field),
    surplusCount: (state) => formatSurplusCount(state.field),
    slowdown: (state) => formatSlowdown(state.field),
  });
}
