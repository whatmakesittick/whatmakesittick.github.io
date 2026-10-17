import type { Readout } from '@core/explainer';
import { SPRINT_THRUST_N, TANK_PRESSURE_BAR } from '../model';
import { createLiveReader } from '../state';
import type { ThrusterCarStoreState } from '../state';
import { THEME } from '../theme';
import {
  TENTHS,
  formatBar,
  formatKmh,
  formatMassFlow,
  formatMetres,
  formatPercent,
  formatThrust,
} from './format';

const read = createLiveReader();

export const THRUSTER_CAR_READOUTS: readonly Readout<ThrusterCarStoreState>[] = [
  {
    id: 'pressure',
    labelKey: 'readouts.pressure',
    numeric: true,
    value: (state) => formatBar(read(state).tank.pressureBar),
    meter: {
      share: (state) => read(state).tank.pressureBar / TANK_PRESSURE_BAR,
      fill: THEME.pressure,
    },
  },
  {
    id: 'thrust',
    labelKey: 'readouts.thrust',
    numeric: true,
    value: (state) => formatThrust(read(state).thrustN),
    meter: {
      share: (state) => Math.min(1, read(state).thrustN / SPRINT_THRUST_N),
      fill: THEME.netThrust,
    },
  },
  {
    id: 'massFlow',
    labelKey: 'readouts.massFlow',
    numeric: true,
    value: (state) => formatMassFlow(read(state).massFlowKgS, TENTHS),
  },
  {
    id: 'height',
    labelKey: 'readouts.height',
    numeric: true,
    value: (state) => formatMetres(read(state).car.height, TENTHS),
  },
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatKmh(read(state).car.speed),
  },
  {
    id: 'gasLeft',
    labelKey: 'readouts.gasLeft',
    numeric: true,
    value: (state) => formatPercent(read(state).tank.massShare),
    tone: (state) => (read(state).tank.empty ? THEME.empty : THEME.text),
    meter: { share: (state) => read(state).tank.massShare, fill: THEME.plumeAir },
  },
];
