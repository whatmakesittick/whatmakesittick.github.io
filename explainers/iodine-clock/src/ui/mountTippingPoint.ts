import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { clockReading, switchSecondsOf } from '../state';
import type { ClockStore } from '../state';
import { chapterOf } from './chapters';
import { mountClockGraph } from './clockGraph';
import { formatMillimolar, formatPace, formatSwitch } from './format';
import { formatIodineNow } from './readouts';

export function mountTippingPoint(root: Document, store: ClockStore): Disposer {
  const chapter = chapterOf(root, 'tippingPoint');
  return disposeAll([
    mountClockGraph(chapter, store),
    mountLiveReadouts(chapter, store, {
      switchAt: (state) => formatSwitch(switchSecondsOf(state)),
      bisulfiteNow: (state) => formatMillimolar(clockReading(state).bisulfiteM),
      iodineNow: formatIodineNow,
      pace: (state) => formatPace(state.phase, switchSecondsOf(state), state.speed),
    }),
  ]);
}
