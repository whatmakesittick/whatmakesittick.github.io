import type { Readout } from '@core/explainer';
import { runAt } from '../state';
import type { NavalDroneStoreState } from '../state';
import { formatBoatSpeed, formatDistance, formatMode, formatPhase } from './format';
import { MODE_TONES } from './palette';

export const NAVAL_DRONE_READOUTS: readonly Readout<NavalDroneStoreState>[] = [
  {
    id: 'clock',
    labelKey: 'readouts.clock',
    numeric: true,
    value: (state) => formatPhase(state.phase),
  },
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatBoatSpeed(runAt(state).boat.knots),
  },
  {
    id: 'mode',
    labelKey: 'readouts.mode',
    numeric: false,
    value: (state) => formatMode(runAt(state).planing.mode),
    tone: (state) => MODE_TONES[runAt(state).planing.mode],
  },
  {
    id: 'distance',
    labelKey: 'readouts.distance',
    numeric: true,
    value: (state) => formatDistance(runAt(state).distanceToShip),
  },
];
