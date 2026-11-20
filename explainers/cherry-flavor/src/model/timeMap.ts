import { clamp } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { MomentId, PhaseId } from '../ids';

export interface Span {
  start: number;
  end: number;
}

export const CYCLE_UNITS = 1000;
export const START_S = -2;
export const END_S = 18;
export const UNITS_PER_S = 50;

export const PHASE_RANGES: Readonly<Record<PhaseId, Span>> = {
  spoon: { start: 0, end: 100 },
  tongue: { start: 100, end: 175 },
  melting: { start: 175, end: 350 },
  rising: { start: 350, end: 500 },
  receptors: { start: 500, end: 700 },
  swallow: { start: 700, end: CYCLE_UNITS },
};

const LAST_PHASE: PhaseId = 'swallow';

export function secondsAt(units: number): number {
  return START_S + clamp(units, 0, CYCLE_UNITS) / UNITS_PER_S;
}

export function unitsAt(seconds: number): number {
  return clamp((seconds - START_S) * UNITS_PER_S, 0, CYCLE_UNITS);
}

function secondsOf({ start, end }: Span): Span {
  return { start: secondsAt(start), end: secondsAt(end) };
}

export const PHASE_SECONDS: Readonly<Record<PhaseId, Span>> = {
  spoon: secondsOf(PHASE_RANGES.spoon),
  tongue: secondsOf(PHASE_RANGES.tongue),
  melting: secondsOf(PHASE_RANGES.melting),
  rising: secondsOf(PHASE_RANGES.rising),
  receptors: secondsOf(PHASE_RANGES.receptors),
  swallow: secondsOf(PHASE_RANGES.swallow),
};

export function phaseIdAt(units: number): PhaseId {
  return PHASE_IDS.find((id) => units < PHASE_RANGES[id].end) ?? LAST_PHASE;
}

export function phaseProgress(units: number): number {
  const { start, end } = PHASE_RANGES[phaseIdAt(units)];
  return clamp((units - start) / (end - start), 0, 1);
}

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  inMouth: PHASE_RANGES.tongue.start,
  melted: PHASE_RANGES.melting.end,
  firing: 600,
  swallow: PHASE_RANGES.swallow.start,
};
