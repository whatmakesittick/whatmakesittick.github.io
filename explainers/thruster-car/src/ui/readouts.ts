import type { Readout } from '@core/explainer';
import { SPRINT_THRUST_N, TANK_PRESSURE_BAR } from '../model';
import { liveReading } from '../state';
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

export const THRUSTER_CAR_READOUTS: readonly Readout<ThrusterCarStoreState>[] = [
  {
    id: 'pressure',
    labelKey: 'readouts.pressure',
    numeric: true,
    value: (state) => formatBar(liveReading(state).tank.pressureBar),
    meter: {
      share: (state) => liveReading(state).tank.pressureBar / TANK_PRESSURE_BAR,
      fill: THEME.pressure,
    },
  },
  {
    id: 'thrust',
    labelKey: 'readouts.thrust',
    numeric: true,
    value: (state) => formatThrust(liveReading(state).thrustN),
    meter: {
      share: (state) => Math.min(1, liveReading(state).thrustN / SPRINT_THRUST_N),
      fill: THEME.netThrust,
    },
  },
  {
    id: 'massFlow',
    labelKey: 'readouts.massFlow',
    numeric: true,
    value: (state) => formatMassFlow(liveReading(state).massFlowKgS, TENTHS),
  },
  {
    id: 'height',
    labelKey: 'readouts.height',
    numeric: true,
    value: (state) => formatMetres(liveReading(state).car.height, TENTHS),
  },
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatKmh(liveReading(state).car.speed),
  },
  {
    id: 'gasLeft',
    labelKey: 'readouts.gasLeft',
    numeric: true,
    value: (state) => formatPercent(liveReading(state).tank.massShare),
    tone: (state) => (liveReading(state).tank.empty ? THEME.empty : THEME.text),
    meter: { share: (state) => liveReading(state).tank.massShare, fill: THEME.plumeAir },
  },
];
