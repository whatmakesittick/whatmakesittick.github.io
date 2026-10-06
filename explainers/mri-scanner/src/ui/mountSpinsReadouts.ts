import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { MriScannerStore } from '../state';
import { formatLarmorBand, formatSlowdown, formatSurplus, formatSurplusCount } from './format';

const SPINS_CHAPTER = 'section.chapter[data-preset="spins"]';

export function mountSpinsReadouts(root: Document, store: MriScannerStore): Disposer {
  return mountLiveReadouts(requireElement(root, SPINS_CHAPTER), store, {
    larmor: (state) => formatLarmorBand(state.field),
    surplus: (state) => formatSurplus(state.field),
    surplusCount: (state) => formatSurplusCount(state.field),
    slowdown: (state) => formatSlowdown(state.field, state.speed),
  });
}
