import type { Readout } from '@core/explainer';
import { missionAt } from '../state';
import type { ReaperStoreState } from '../state';
import { formatAltitude, formatClock, formatFuel, formatKmh } from './format';
import { FUEL_METER_FILL } from './palette';

export const REAPER_READOUTS: readonly Readout<ReaperStoreState>[] = [
  {
    id: 'clock',
    labelKey: 'readouts.clock',
    numeric: true,
    value: (state) => formatClock(missionAt(state).clock),
  },
  {
    id: 'altitude',
    labelKey: 'readouts.altitude',
    numeric: true,
    value: (state) => formatAltitude(missionAt(state).flight.altitude),
  },
  {
    id: 'airspeed',
    labelKey: 'readouts.airspeed',
    numeric: true,
    value: (state) => formatKmh(missionAt(state).flight.airspeed),
  },
  {
    id: 'fuel',
    labelKey: 'readouts.fuel',
    numeric: true,
    value: (state) => formatFuel(missionAt(state).fuel),
    meter: { share: (state) => missionAt(state).fuel.share, fill: FUEL_METER_FILL },
  },
];
