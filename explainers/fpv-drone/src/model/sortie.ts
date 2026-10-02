import { clamp } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { MomentId, PhaseId } from '../ids';

export const SORTIE_SECONDS = 80;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;

export interface PhaseRange {
  start: number;
  end: number;
}

export interface ClockReading {
  minutes: number;
  seconds: number;
}

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  takeoff: { start: 0, end: 5 },
  climb: { start: 5, end: 13 },
  transit: { start: 13, end: 27 },
  orbit: { start: 27, end: 49 },
  return: { start: 49, end: 67 },
  landing: { start: 67, end: SORTIE_SECONDS },
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  liftoff: 2,
  cruise: PHASE_RANGES.climb.end,
  onStation: PHASE_RANGES.orbit.start,
  turnHome: PHASE_RANGES.return.start,
  touchdown: 78,
};

const LAST_PHASE = PHASE_IDS[PHASE_IDS.length - 1];

export function clampSeconds(seconds: number): number {
  return clamp(seconds, 0, SORTIE_SECONDS);
}

export function phaseAt(seconds: number): PhaseId {
  const value = clampSeconds(seconds);
  return PHASE_IDS.find((id) => value < PHASE_RANGES[id].end) ?? LAST_PHASE;
}

export function phaseShareAt(seconds: number): number {
  const { start, end } = PHASE_RANGES[phaseAt(seconds)];
  return clamp((seconds - start) / (end - start), 0, 1);
}

export function clockAt(seconds: number): ClockReading {
  const whole = Math.round(clampSeconds(seconds));
  return {
    minutes: Math.floor(whole / SECONDS_PER_MINUTE),
    seconds: whole % SECONDS_PER_MINUTE,
  };
}

export function sortieShareAt(seconds: number): number {
  return clampSeconds(seconds) / SORTIE_SECONDS;
}
