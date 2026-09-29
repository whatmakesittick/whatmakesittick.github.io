import type { PlaybackState } from '@core/explainer';
import type { PlumeState } from '../ids';
import {
  CUTOFF_TIME,
  SEA_LEVEL_PRESSURE_PA,
  START_SEQUENCE,
  engineState,
  exitPressureBar,
  plumeState,
  pressureRatio,
} from '../model';
import type { EngineState } from '../model';
import {
  chamberPressureBar,
  exhaustSpeedKmS,
  massFlow,
  methaneFlow,
  oxygenFlow,
  specificImpulse,
  thrustTf,
} from '../model/performance';

type TimeState = Pick<PlaybackState, 'phase'>;

const PASCALS_PER_BAR = 100000;

export type PlumeReading = PlumeState | 'off';

export interface Performance {
  firing: boolean;
  steady: boolean;
  thrustTf: number;
  specificImpulse: number;
  massFlow: number;
  oxygenFlow: number;
  methaneFlow: number;
  chamberPressureBar: number;
  exhaustSpeedKmS: number;
  exitPressureBar: number;
  airPressureBar: number;
  airShare: number;
  pressureRatio: number;
  plume: PlumeReading;
}

function rememberLast<T>(compute: (phase: number) => T): (phase: number) => T {
  let last: { phase: number; value: T } | null = null;
  return (phase) => {
    if (last?.phase !== phase) last = { phase, value: compute(phase) };
    return last.value;
  };
}

const latestEngine = rememberLast(engineState);

export function engineOf(state: TimeState): Readonly<EngineState> {
  return latestEngine(state.phase);
}

function performanceAt(phase: number): Performance {
  const { time, throttle, airPressurePa } = latestEngine(phase);
  const firing = throttle > 0;
  const steady = time >= START_SEQUENCE.fullThrust && time < CUTOFF_TIME;
  const ratio = pressureRatio(throttle, airPressurePa);
  return {
    firing,
    steady,
    thrustTf: thrustTf(throttle, airPressurePa),
    specificImpulse: specificImpulse(throttle, airPressurePa),
    massFlow: massFlow(throttle),
    oxygenFlow: oxygenFlow(throttle),
    methaneFlow: methaneFlow(throttle),
    chamberPressureBar: chamberPressureBar(throttle),
    exhaustSpeedKmS: exhaustSpeedKmS(throttle, airPressurePa),
    exitPressureBar: exitPressureBar(throttle),
    airPressureBar: airPressurePa / PASCALS_PER_BAR,
    airShare: airPressurePa / SEA_LEVEL_PRESSURE_PA,
    pressureRatio: ratio,
    plume: firing ? plumeState(ratio) : 'off',
  };
}

const latestPerformance = rememberLast(performanceAt);

export function performanceOf(state: TimeState): Readonly<Performance> {
  return latestPerformance(state.phase);
}
