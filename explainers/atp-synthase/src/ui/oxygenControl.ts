import { mountRangeWidget } from '@core/ui/rangeWidget';
import { atpKgPerHour, atpKgPerMinute, timesRest } from '../model';
import { OXYGEN_RANGE } from '../state';
import type { AtpSynthaseStore } from '../state';
import type { Disposer } from './disposers';
import {
  formatKilogramsPerHour,
  formatKilogramsPerMinute,
  formatOxygen,
  formatTimes,
} from './format';

export function mountOxygenControl(root: Document, store: AtpSynthaseStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'oxygen',
    range: OXYGEN_RANGE,
    select: (state) => [state.oxygen] as const,
    value: ([oxygen]) => oxygen,
    format: ([oxygen]) => formatOxygen(oxygen),
    set: (state, oxygen) => state.setOxygen(oxygen),
    readouts: {
      'oxygen-perMinute': ([oxygen]) => formatKilogramsPerMinute(atpKgPerMinute(oxygen)),
      'oxygen-perHour': ([oxygen]) => formatKilogramsPerHour(atpKgPerHour(oxygen)),
      'oxygen-vsRest': ([oxygen]) => formatTimes(timesRest(oxygen)),
    },
  });
}
