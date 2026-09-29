import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { CUTOFF_TIME, altitudeKm } from '../model';
import { engineOf, performanceOf } from '../state';
import type { RaptorStoreState } from '../state';
import {
  formatBar,
  formatKm,
  formatPercent,
  formatSeconds,
  formatTonnes,
  unlessOff,
} from './format';
import {
  AIR_METER_FILL,
  ALTITUDE_METER_FILL,
  EFFICIENCY_METER_FILL,
  NEUTRAL_TONE,
  RUNNING_TONE,
  THROTTLE_METER_FILL,
  THRUST_METER_FILL,
} from './palette';

export const THRUST_FULL_SCALE_TF = 280;
export const EFFICIENCY_SCALE_S = { min: 300, max: 360 } as const;
export const ALTITUDE_FULL_SCALE_KM = altitudeKm(CUTOFF_TIME);

function thrust(state: RaptorStoreState): number {
  return performanceOf(state).thrustTf;
}

function impulse(state: RaptorStoreState): number {
  return performanceOf(state).specificImpulse;
}

function efficiencyShare(state: RaptorStoreState): number {
  const { min, max } = EFFICIENCY_SCALE_S;
  if (!performanceOf(state).steady) return 0;
  return clamp((impulse(state) - min) / (max - min), 0, 1);
}

export const RAPTOR_READOUTS: readonly Readout<RaptorStoreState>[] = [
  {
    id: 'thrust',
    labelKey: 'readouts.thrust',
    numeric: true,
    value: (state) => unlessOff(performanceOf(state).firing, () => formatTonnes(thrust(state))),
    tone: (state) => (engineOf(state).running ? RUNNING_TONE : NEUTRAL_TONE),
    meter: { share: (state) => thrust(state) / THRUST_FULL_SCALE_TF, fill: THRUST_METER_FILL },
  },
  {
    id: 'efficiency',
    labelKey: 'readouts.efficiency',
    numeric: true,
    value: (state) => unlessOff(performanceOf(state).steady, () => formatSeconds(impulse(state))),
    meter: { share: efficiencyShare, fill: EFFICIENCY_METER_FILL },
  },
  {
    id: 'airPressure',
    labelKey: 'readouts.airPressure',
    numeric: true,
    value: (state) => formatBar(performanceOf(state).airPressureBar),
    meter: { share: (state) => performanceOf(state).airShare, fill: AIR_METER_FILL },
  },
  {
    id: 'altitude',
    labelKey: 'readouts.altitude',
    numeric: true,
    value: (state) => formatKm(engineOf(state).altitudeKm),
    meter: {
      share: (state) => engineOf(state).altitudeKm / ALTITUDE_FULL_SCALE_KM,
      fill: ALTITUDE_METER_FILL,
    },
  },
  {
    id: 'throttle',
    labelKey: 'readouts.throttle',
    numeric: true,
    value: (state) => formatPercent(engineOf(state).throttle),
    meter: { share: (state) => engineOf(state).throttle, fill: THROTTLE_METER_FILL },
  },
];
