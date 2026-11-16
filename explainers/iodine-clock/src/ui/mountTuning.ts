import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { IODATE_RANGE_MM, TEMPERATURE_RANGE_C } from '../model';
import { switchSecondsOf } from '../state';
import type { ClockStore } from '../state';
import { chapterOf } from './chapters';
import { mountClockGraph } from './clockGraph';
import { formatIodateSetting, formatRatio, formatSwitch, formatTemperature } from './format';

export function mountTuning(root: Document, store: ClockStore): Disposer {
  const chapter = chapterOf(root, 'tuning');
  return disposeAll([
    mountRangeWidget(chapter, store, {
      control: 'iodate',
      range: IODATE_RANGE_MM,
      select: (state) => [state.iodateMm] as const,
      value: ([iodateMm]) => iodateMm,
      format: ([iodateMm]) => formatIodateSetting(iodateMm),
      set: (state, iodateMm) => state.setIodate(iodateMm),
    }),
    mountRangeWidget(chapter, store, {
      control: 'temperature',
      range: TEMPERATURE_RANGE_C,
      select: (state) => [state.temperatureC] as const,
      value: ([temperatureC]) => temperatureC,
      format: ([temperatureC]) => formatTemperature(temperatureC),
      set: (state, temperatureC) => state.setTemperature(temperatureC),
    }),
    mountClockGraph(chapter, store),
    mountLiveReadouts(chapter, store, {
      tuningSwitch: (state) => formatSwitch(switchSecondsOf(state)),
      tuningRatio: (state) => formatRatio(state.iodateMm),
    }),
  ]);
}
