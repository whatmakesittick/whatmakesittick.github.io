import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TARGET_RANGE_KM, flightSeconds } from '../model';
import type { ReaperStore } from '../state';
import { formatFlightSeconds, formatKm } from './format';

type SelectedRange = readonly [targetRange: number];

function flightOf([km]: SelectedRange): string {
  return formatFlightSeconds(flightSeconds(km));
}

export function mountTargetRangeControl(root: Document, store: ReaperStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'target-range',
    range: TARGET_RANGE_KM,
    select: (state): SelectedRange => [state.targetRange],
    value: ([km]) => km,
    format: ([km]) => formatKm(km),
    set: (state, km) => state.setTargetRange(km),
    readouts: {
      'strike-time': flightOf,
      'strike-laser': flightOf,
    },
  });
}
