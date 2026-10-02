import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { missionAt } from '../state';
import type { ReaperStore } from '../state';
import { formatLinkCrew, formatLinkDelay, formatLinkMode } from './format';

export function mountLinkReadouts(root: Document, store: ReaperStore): Disposer {
  return mountLiveReadouts(root, store, {
    'link-mode': (state) => formatLinkMode(missionAt(state).link),
    'link-crew': (state) => formatLinkCrew(missionAt(state).link),
    'link-delay': (state) => formatLinkDelay(missionAt(state).link),
  });
}
