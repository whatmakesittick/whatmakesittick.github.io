import type { PaceId, TimingReading } from '../ids';
import { GAIT_DATA } from './gaitData';

interface PaceBundle {
  speedMs: number;
  cadence: number;
  toeOffPercent: number;
  peakForceBW: number;
  subjects: number;
}

export const DEFAULT_PACE: PaceId = 'steady';

const PACE_SPEEDS_MS: Readonly<Record<PaceId, number>> = { easy: 2.5, steady: 3.5, fast: 4.5 };

const SECONDS_PER_MINUTE = 60;
const STEPS_PER_STRIDE = 2;
const FLOATS_PER_STRIDE = 2;
const HALF_CYCLE_UNITS = 500;
const CYCLE_UNITS_FOR_SHARE = 1000;
const PERCENT = 100;
const METRES_PER_KILOMETRE = 1000;

function bundle(pace: PaceId): PaceBundle {
  const data = GAIT_DATA[pace];
  return {
    speedMs: PACE_SPEEDS_MS[pace],
    cadence: data.cadence,
    toeOffPercent: data.toeOffUnits / (CYCLE_UNITS_FOR_SHARE / PERCENT),
    peakForceBW: data.peakVerticalBW,
    subjects: data.n,
  };
}

export const PACES: Readonly<Record<PaceId, PaceBundle>> = {
  easy: bundle('easy'),
  steady: bundle('steady'),
  fast: bundle('fast'),
};

export function cadenceAt(pace: PaceId, stepRate: number): number {
  return PACES[pace].cadence * (1 + stepRate / PERCENT);
}

export function strideTimeS(pace: PaceId, stepRate: number): number {
  return (STEPS_PER_STRIDE * SECONDS_PER_MINUTE) / cadenceAt(pace, stepRate);
}

export function stepLengthM(pace: PaceId, stepRate: number): number {
  return (PACES[pace].speedMs * SECONDS_PER_MINUTE) / cadenceAt(pace, stepRate);
}

export function strideLengthM(pace: PaceId, stepRate: number): number {
  return STEPS_PER_STRIDE * stepLengthM(pace, stepRate);
}

export function timingAt(pace: PaceId, stepRate: number): TimingReading {
  const strideTime = strideTimeS(pace, stepRate);
  const dutyFactor = GAIT_DATA[pace].toeOffUnits / CYCLE_UNITS_FOR_SHARE;
  const contactTime = dutyFactor * strideTime;
  return {
    cadence: cadenceAt(pace, stepRate),
    stepTimeS: strideTime / STEPS_PER_STRIDE,
    strideTimeS: strideTime,
    contactTimeS: contactTime,
    flightTimeS: strideTime / STEPS_PER_STRIDE - contactTime,
    stepLengthM: stepLengthM(pace, stepRate),
    strideLengthM: strideLengthM(pace, stepRate),
    speedMs: PACES[pace].speedMs,
    floatShare:
      (FLOATS_PER_STRIDE * (HALF_CYCLE_UNITS - GAIT_DATA[pace].toeOffUnits)) /
      CYCLE_UNITS_FOR_SHARE,
    dutyFactor,
  };
}

export function formatPaceKm(speedMs: number): string {
  const seconds = Math.round(METRES_PER_KILOMETRE / speedMs);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${minutes}:${rest}`;
}
