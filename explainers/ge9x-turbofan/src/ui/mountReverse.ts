import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { thrustNow } from '../state';
import type { EngineStore } from '../state';
import { chapterOf } from './chapters';
import { formatThrust } from './format';

export function mountReverse(root: Document, store: EngineStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'reverse'), store, {
    thrustLive: (state) => formatThrust(thrustNow(state)),
  });
}
