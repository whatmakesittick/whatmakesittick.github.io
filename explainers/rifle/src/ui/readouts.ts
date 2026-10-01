import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { MUZZLE_SPEED } from '../model';
import { cycleOf } from '../state';
import type { RifleStoreState } from '../state';
import { carrierShare } from './cycleTexts';
import { formatMs, formatPercent, formatPressure, formatSpeedMs } from './format';
import { CARRIER_METER_FILL, PRESSURE_METER_FILL, SPEED_METER_FILL } from './palette';

export const PRESSURE_FULL_SCALE_MPA = 300;

function share(value: number, fullScale: number): number {
  return clamp(value / fullScale, 0, 1);
}

export const RIFLE_READOUTS: readonly Readout<RifleStoreState>[] = [
  {
    id: 'time',
    labelKey: 'readouts.time',
    numeric: true,
    value: (state) => formatMs(cycleOf(state).ms),
  },
  {
    id: 'pressure',
    labelKey: 'readouts.pressure',
    numeric: true,
    value: (state) => formatPressure(cycleOf(state).shot.pressure),
    meter: {
      share: (state) => share(cycleOf(state).shot.pressure, PRESSURE_FULL_SCALE_MPA),
      fill: PRESSURE_METER_FILL,
    },
  },
  {
    id: 'bulletSpeed',
    labelKey: 'readouts.bulletSpeed',
    numeric: true,
    value: (state) => formatSpeedMs(cycleOf(state).shot.speed),
    meter: {
      share: (state) => share(cycleOf(state).shot.speed, MUZZLE_SPEED),
      fill: SPEED_METER_FILL,
    },
  },
  {
    id: 'carrier',
    labelKey: 'readouts.carrier',
    numeric: true,
    value: (state) => formatPercent(carrierShare(state)),
    meter: { share: carrierShare, fill: CARRIER_METER_FILL },
  },
];
