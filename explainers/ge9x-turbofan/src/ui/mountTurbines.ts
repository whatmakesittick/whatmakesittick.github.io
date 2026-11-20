import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { spoolsNow } from '../state';
import type { EngineStore } from '../state';
import { chapterOf } from './chapters';
import { formatPercent } from './format';

export function mountTurbines(root: Document, store: EngineStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'turbines'), store, {
    fanLive: (state) => formatPercent(spoolsNow(state).fan),
    coreLive: (state) => formatPercent(spoolsNow(state).core),
  });
}
