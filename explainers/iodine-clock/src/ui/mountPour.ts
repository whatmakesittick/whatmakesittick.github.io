import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { clockReading } from '../state';
import type { ClockStore } from '../state';
import { chapterOf } from './chapters';
import { formatClock } from './format';

export function mountPour(root: Document, store: ClockStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'pour'), store, {
    pourClock: (state) => {
      const { seconds, switchSeconds } = clockReading(state);
      return formatClock(seconds, switchSeconds);
    },
  });
}
