import type { Readout } from '@core/explainer';
import { flightState } from '../model';
import type { FlightState } from '../model';
import type { GliderState, GliderStoreState } from '../state';
import { formatMetres, formatRate, formatSignedRate, formatSpeed } from './format';
import { CLIMB_TONES, HEIGHT_METER_FILL } from './palette';
import type { ClimbTendency } from './palette';

const METER_TOP_METRES = 3000;
const LEVEL_BAND = 0.2;

function flight(state: GliderState): FlightState {
  return flightState(state.phase, state.glider);
}

function climbTendency(climb: number): ClimbTendency {
  if (climb > LEVEL_BAND) return 'up';
  if (climb < -LEVEL_BAND) return 'down';
  return 'level';
}

export const GLIDER_READOUTS: readonly Readout<GliderStoreState>[] = [
  {
    id: 'height',
    labelKey: 'readouts.height',
    numeric: true,
    value: (state) => formatMetres(flight(state).height),
    meter: {
      share: (state) => Math.min(1, flight(state).height / METER_TOP_METRES),
      fill: HEIGHT_METER_FILL,
    },
  },
  {
    id: 'airspeed',
    labelKey: 'readouts.airspeed',
    numeric: true,
    value: (state) => formatSpeed(flight(state).airspeed),
  },
  {
    id: 'lift',
    labelKey: 'readouts.lift',
    numeric: true,
    value: (state) => formatSignedRate(flight(state).lift),
  },
  {
    id: 'sink',
    labelKey: 'readouts.sink',
    numeric: true,
    value: (state) => formatRate(flight(state).sink),
  },
  {
    id: 'climb',
    labelKey: 'readouts.climb',
    numeric: true,
    value: (state) => formatSignedRate(flight(state).climb),
    tone: (state) => CLIMB_TONES[climbTendency(flight(state).climb)],
  },
];
