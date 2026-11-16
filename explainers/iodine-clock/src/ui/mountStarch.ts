import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { clockReading } from '../state';
import type { ClockStore } from '../state';
import { chapterOf } from './chapters';
import { formatPercent } from './format';
import { mountStepList } from './stepList';

export function mountStarch(root: Document, store: ClockStore): Disposer {
  const chapter = chapterOf(root, 'starch');
  return disposeAll([
    mountStepList(chapter, store),
    mountLiveReadouts(chapter, store, {
      helixFill: (state) => formatPercent(clockReading(state).complex),
    }),
  ]);
}
