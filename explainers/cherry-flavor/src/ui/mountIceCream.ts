import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { FAT_RANGE_PERCENT, SERVING_RANGE_C, peakNoseShare } from '../model';
import { flavorReading } from '../state';
import type { FlavorStore, FlavorStoreState } from '../state';
import { chapterOf } from './chapters';
import { formatCelsius, formatPercent, formatPercentSetting } from './format';

function peakOf(state: FlavorStoreState): number {
  const { profile } = flavorReading(state);
  return peakNoseShare(
    { profile, servingC: state.servingC, fatPercent: state.fatPercent },
    state.view.pinched,
  );
}

export function mountIceCream(root: Document, store: FlavorStore): Disposer {
  const chapter = chapterOf(root, 'iceCream');
  return disposeAll([
    mountRangeWidget(chapter, store, {
      control: 'serving',
      range: SERVING_RANGE_C,
      select: (state) => [state.servingC] as const,
      value: ([servingC]) => servingC,
      format: ([servingC]) => formatCelsius(servingC),
      set: (state, servingC) => state.setServing(servingC),
    }),
    mountRangeWidget(chapter, store, {
      control: 'fat',
      range: FAT_RANGE_PERCENT,
      select: (state) => [state.fatPercent] as const,
      value: ([fatPercent]) => fatPercent,
      format: ([fatPercent]) => formatPercentSetting(fatPercent),
      set: (state, fatPercent) => state.setFat(fatPercent),
    }),
    mountLiveReadouts(chapter, store, {
      iceReleased: (state) => formatPercent(flavorReading(state).released),
      icePeak: (state) => formatPercent(peakOf(state)),
      iceMelted: (state) => formatPercent(flavorReading(state).melt),
    }),
  ]);
}
