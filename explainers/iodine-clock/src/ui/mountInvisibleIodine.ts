import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { clockReading } from '../state';
import type { ClockStore } from '../state';
import { chapterOf } from './chapters';
import { formatLifetime } from './format';
import { mountStepList } from './stepList';

export function mountInvisibleIodine(root: Document, store: ClockStore): Disposer {
  const chapter = chapterOf(root, 'invisibleIodine');
  return disposeAll([
    mountStepList(chapter, store),
    mountLiveReadouts(chapter, store, {
      iodineLifetime: (state) => formatLifetime(clockReading(state).lifetimeSeconds),
    }),
  ]);
}
