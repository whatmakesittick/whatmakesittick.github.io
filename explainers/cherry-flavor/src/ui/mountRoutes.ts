import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { levelShare } from '../model';
import { flavorReading } from '../state';
import type { FlavorStore } from '../state';
import { chapterOf } from './chapters';
import { formatPercent } from './format';
import { perceptText } from './text';

export function mountRoutes(root: Document, store: FlavorStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'routes'), store, {
    routesOrtho: (state) => formatPercent(levelShare(flavorReading(state).ortho)),
    routesRetro: (state) => formatPercent(levelShare(flavorReading(state).retro)),
    routesNotice: (state) => perceptText(flavorReading(state)),
  });
}
