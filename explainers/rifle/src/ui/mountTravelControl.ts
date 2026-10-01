import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import type { GasPortId, ShotReading } from '../ids';
import { BULLET_TRAVEL } from '../model/layout';
import { cycleOf } from '../state';
import type { RifleStore } from '../state';
import { formatMm, formatPressure, formatSpeedMs, formatSpin, formatTurns } from './format';

type SelectedMoment = readonly [phase: number, gasPort: GasPortId];

export const TRAVEL_RANGE = { min: 0, max: Math.round(BULLET_TRAVEL), step: 1 } as const;

function shotOf([phase, gasPort]: SelectedMoment): Readonly<ShotReading> {
  return cycleOf({ phase, gasPort }).shot;
}

function travelOf(selected: SelectedMoment): number {
  return shotOf(selected).travel;
}

export function mountTravelControl(root: Document, store: RifleStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'bullet-travel',
    range: TRAVEL_RANGE,
    select: (state): SelectedMoment => [state.phase, state.gasPort],
    value: travelOf,
    format: (selected) => formatMm(travelOf(selected)),
    set: (state, mm) => state.seekTravel(mm),
    refreshIntervalMs: TEXT_REFRESH_INTERVAL_MS,
    readouts: {
      'barrel-speed': (selected) => formatSpeedMs(shotOf(selected).speed),
      'barrel-pressure': (selected) => formatPressure(shotOf(selected).pressure),
      'barrel-spin': (selected) => formatSpin(shotOf(selected).spin),
      'barrel-turns': (selected) => formatTurns(shotOf(selected).turns),
    },
  });
}
