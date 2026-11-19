import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { flavorReading } from '../state';
import type { FlavorStore } from '../state';
import { chapterOf } from './chapters';
import { formatCelsius, formatPercent } from './format';

export function mountTongue(root: Document, store: FlavorStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'tongue'), store, {
    tongueTemp: (state) => formatCelsius(flavorReading(state).temperatureC),
    tongueSweet: (state) => formatPercent(flavorReading(state).taste.sweet),
    tongueSour: (state) => formatPercent(flavorReading(state).taste.sour),
    tongueCold: (state) => formatPercent(flavorReading(state).taste.cold),
  });
}
