import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { acidMadeM, clockReading, iodideMadeM } from '../state';
import type { ClockStore } from '../state';
import { chapterOf } from './chapters';
import { formatMillimolar } from './format';
import { mountStepList } from './stepList';

export function mountSlowStep(root: Document, store: ClockStore): Disposer {
  const chapter = chapterOf(root, 'slowStep');
  return disposeAll([
    mountStepList(chapter, store),
    mountLiveReadouts(chapter, store, {
      bisulfiteLeft: (state) => formatMillimolar(clockReading(state).bisulfiteM),
      iodideMade: (state) => formatMillimolar(iodideMadeM(clockReading(state))),
      acidMade: (state) => formatMillimolar(acidMadeM(clockReading(state))),
    }),
  ]);
}
