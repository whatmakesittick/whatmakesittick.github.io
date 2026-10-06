import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { MriScannerStore } from '../state';
import { formatEarthMultiple, formatFringe, formatHelium } from './format';

export function mountMagnetReadouts(root: Document, store: MriScannerStore): Disposer {
  return mountLiveReadouts(root, store, {
    earthMultiple: (state) => formatEarthMultiple(state.field),
    heliumTemp: () => formatHelium(),
    fringe: (state) => formatFringe(state.field),
  });
}
