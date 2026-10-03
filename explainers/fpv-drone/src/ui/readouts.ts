import type { Readout } from '@core/explainer';
import { sortieAt } from '../state';
import type { FpvStoreState } from '../state';
import { formatBattery, formatClock, formatKmh, formatMetres } from './format';
import { BATTERY_METER_FILL } from './palette';

export const FPV_READOUTS: readonly Readout<FpvStoreState>[] = [
  {
    id: 'clock',
    labelKey: 'readouts.clock',
    numeric: true,
    value: (state) => formatClock(state.phase),
  },
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatKmh(sortieAt(state).flight.speedKmh),
  },
  {
    id: 'height',
    labelKey: 'readouts.height',
    numeric: true,
    value: (state) => formatMetres(sortieAt(state).flight.height),
  },
  {
    id: 'battery',
    labelKey: 'readouts.battery',
    numeric: true,
    value: (state) => formatBattery(sortieAt(state).battery),
    meter: { share: (state) => sortieAt(state).battery.share, fill: BATTERY_METER_FILL },
  },
  {
    id: 'distance',
    labelKey: 'readouts.distance',
    numeric: true,
    value: (state) => formatMetres(sortieAt(state).link.distance),
  },
];
