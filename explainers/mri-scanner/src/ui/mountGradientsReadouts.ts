import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { MriScannerStore } from '../state';
import {
  formatAxisRole,
  formatEdgeShift,
  formatFieldShare,
  formatRise,
  formatSpread,
} from './format';

export function mountGradientsReadouts(root: Document, store: MriScannerStore): Disposer {
  return mountLiveReadouts(root, store, {
    edgeShift: () => formatEdgeShift(),
    fieldShare: (state) => formatFieldShare(state.field),
    spread: () => formatSpread(),
    rise: () => formatRise(),
    axisRole: (state) => formatAxisRole(state.gradientAxis),
  });
}
