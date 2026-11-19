import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { flavorReading } from '../state';
import type { FlavorStore } from '../state';
import { chapterOf } from './chapters';
import { formatPercent } from './format';
import { mainShare, mainText } from './text';

export function mountCherry(root: Document, store: FlavorStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'cherry'), store, {
    cherryMain: (state) => mainText(flavorReading(state).profile),
    cherryShare: (state) => formatPercent(mainShare(flavorReading(state).profile)),
  });
}
