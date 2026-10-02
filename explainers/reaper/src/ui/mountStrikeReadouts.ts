import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { missionAt } from '../state';
import type { ReaperStore } from '../state';
import { formatMissileStage } from './format';

export function mountStrikeReadouts(root: Document, store: ReaperStore): Disposer {
  return mountLiveReadouts(root, store, {
    'strike-missile': (state) => formatMissileStage(missionAt(state).strike.stage),
  });
}
