import type { Disposer } from '@core/ui/disposers';
import { CYCLE_MS, SHOTS_PER_MINUTE } from '../model';
import type { RifleStore } from '../state';
import { timeUntilReady } from './cycleTexts';
import { formatMs, formatPerMinute } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountOverviewReadouts(root: Document, store: RifleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'overview-cycle': () => formatMs(CYCLE_MS),
    'overview-pace': () => formatPerMinute(SHOTS_PER_MINUTE),
    'overview-left': timeUntilReady,
  });
}
