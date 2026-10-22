import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { LIFT_TRAVEL_MM, LINE_M } from '../model';
import { createLiveReader } from '../state';
import type { MaglevTrainStoreState } from '../state';
import { THEME } from '../theme';
import { formatClockOf, formatGap, formatKmOf, formatKmh } from './format';

const read = createLiveReader();

function shareOf(value: number, full: number): number {
  return clamp(value / full, 0, 1);
}

export const MAGLEV_TRAIN_READOUTS: readonly Readout<MaglevTrainStoreState>[] = [
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatKmh(read(state).motion.speedKmh),
    meter: {
      share: (state) => shareOf(read(state).motion.speedMs, read(state).topMs),
      fill: THEME.drive,
    },
  },
  {
    id: 'distance',
    labelKey: 'readouts.distance',
    numeric: true,
    value: (state) => formatKmOf(read(state).motion.distance, LINE_M),
    meter: {
      share: (state) => shareOf(read(state).motion.distance, LINE_M),
      fill: THEME.cruise,
    },
  },
  {
    id: 'time',
    labelKey: 'readouts.time',
    numeric: true,
    value: (state) => formatClockOf(read(state).motion.realSeconds, read(state).tripSeconds),
    meter: {
      share: (state) => shareOf(read(state).motion.realSeconds, read(state).tripSeconds),
      fill: THEME.powered,
    },
  },
  {
    id: 'gap',
    labelKey: 'readouts.gap',
    numeric: true,
    value: (state) => formatGap(read(state).motion),
    meter: {
      share: (state) => shareOf(read(state).motion.liftMm, LIFT_TRAVEL_MM),
      fill: THEME.lift,
    },
  },
];
