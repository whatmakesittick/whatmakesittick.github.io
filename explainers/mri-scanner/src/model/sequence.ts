import { clamp, lerp } from '@core/math';
import type { Extent } from '@core/scene/regions';
import type { GradientAxisId, MomentId, PhaseId, RfPulse, WeightingId } from '../ids';
import { PHASE_IDS } from '../ids';
import { MS_PER_S, REAL_LINES, SECONDS_PER_MINUTE } from './constants';

export interface Weighting {
  tr: number;
  te: number;
}

export const WEIGHTINGS: Readonly<Record<WeightingId, Weighting>> = {
  t1: { tr: 500, te: 15 },
  t2: { tr: 2500, te: 100 },
};

export const CYCLE_UNITS = 1000;

export const PHASE_RANGES: Readonly<Record<PhaseId, Extent>> = {
  excite: [0, 150],
  encode: [150, 300],
  refocus: [300, 420],
  echo: [420, 650],
  recover: [650, CYCLE_UNITS],
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  pulse90: 75,
  pulse180: 360,
  echoPeak: 535,
  repetitionEnd: 990,
};

export const LINE_DONE_UNITS = PHASE_RANGES.echo[1];

export const PULSE_MS = 3;
export const REFOCUS_HALF_MS = 1;
export const READOUT_HALF_MS = 4;

export const DEFAULT_SPEED = 6;
export const PICTURE_SPEED = 30;
export const SPEED_RANGE = { min: 2, max: 60, step: 1, default: DEFAULT_SPEED } as const;

const GRADIENTS: Readonly<Record<PhaseId, GradientAxisId | null>> = {
  excite: 'z',
  encode: 'y',
  refocus: 'z',
  echo: 'x',
  recover: null,
};

const RF_PULSES: Readonly<Record<PhaseId, RfPulse | null>> = {
  excite: 90,
  encode: null,
  refocus: 180,
  echo: null,
  recover: null,
};

const KNOT_UNITS = [
  PHASE_RANGES.excite[0],
  PHASE_RANGES.encode[0],
  PHASE_RANGES.refocus[0],
  PHASE_RANGES.echo[0],
  MOMENTS.echoPeak,
  PHASE_RANGES.recover[0],
  CYCLE_UNITS,
] as const;

function knotMs({ tr, te }: Weighting): readonly number[] {
  return [
    0,
    PULSE_MS,
    te / 2 - REFOCUS_HALF_MS,
    te / 2 + REFOCUS_HALF_MS,
    te,
    te + READOUT_HALF_MS,
    tr,
  ];
}

function piecewise(value: number, from: readonly number[], to: readonly number[]): number {
  const last = from.length - 1;
  const clamped = clamp(value, from[0], from[last]);
  const index = from.findIndex((knot, at) => at > 0 && clamped <= knot);
  const start = index - 1;
  const span = from[index] - from[start];
  return lerp(to[start], to[index], (clamped - from[start]) / span);
}

export function realMs(phase: number, weighting: WeightingId): number {
  return piecewise(phase, KNOT_UNITS, knotMs(WEIGHTINGS[weighting]));
}

export function phaseAt(ms: number, weighting: WeightingId): number {
  return piecewise(ms, knotMs(WEIGHTINGS[weighting]), KNOT_UNITS);
}

export function phaseOf(phase: number): PhaseId {
  return PHASE_IDS.find((id) => phase < PHASE_RANGES[id][1]) ?? 'recover';
}

export function activeGradient(phase: number): GradientAxisId | null {
  return GRADIENTS[phaseOf(phase)];
}

export function rfPulse(phase: number): RfPulse | null {
  return RF_PULSES[phaseOf(phase)];
}

export function rate(speed: number): number {
  return (CYCLE_UNITS * speed) / SECONDS_PER_MINUTE;
}

export function scanSeconds(weighting: WeightingId): number {
  return (WEIGHTINGS[weighting].tr * REAL_LINES) / MS_PER_S;
}
