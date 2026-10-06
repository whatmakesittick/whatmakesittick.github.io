import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { MriScannerStore } from '../state';
import { formatBoreWidth, formatFieldNow } from './format';

export function mountOverviewReadouts(root: Document, store: MriScannerStore): Disposer {
  return mountLiveReadouts(root, store, {
    fieldNow: (state) => formatFieldNow(state.field),
    boreWidth: () => formatBoreWidth(),
  });
}
