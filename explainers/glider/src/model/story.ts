import { lerp } from '@core/math';
import { wrapPhase } from '@core/store';

export const FLIGHT_CYCLE = 2700;
export const TRANSITION_SECONDS = 30;

export const PHASE_IDS = ['thermal', 'glide', 'ridge', 'wave', 'final'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export interface TimeRange {
  start: number;
  end: number;
}

export const PHASE_RANGES: Record<PhaseId, TimeRange> = {
  thermal: { start: 0, end: 450 },
  glide: { start: 450, end: 990 },
  ridge: { start: 990, end: 1230 },
  wave: { start: 1230, end: 1710 },
  final: { start: 1710, end: 2700 },
};

export interface Keyframe {
  time: number;
  height: number;
}

export const KEYFRAMES: readonly Keyframe[] = [
  { time: 0, height: 500 },
  { time: 450, height: 1500 },
  { time: 990, height: 1150 },
  { time: 1230, height: 1400 },
  { time: 1710, height: 2500 },
  { time: 1950, height: 1560 },
  { time: 2700, height: 500 },
];

export const CLIMB_SPEEDS = { thermal: 90, ridge: 90, wave: 95 } as const;
export const STILL_AIR = 0;
export const WAVE_SINK = -2.5;

export type LegSpec =
  | { phase: PhaseId; kind: 'climb'; airspeed: number }
  | { phase: PhaseId; kind: 'glide'; air: number };

export type Leg = LegSpec & {
  start: number;
  end: number;
  startHeight: number;
  endHeight: number;
  climb: number;
};

export type LegIntegral = (leg: Leg, from: number, to: number) => number;

const LEG_SPECS: readonly LegSpec[] = [
  { phase: 'thermal', kind: 'climb', airspeed: CLIMB_SPEEDS.thermal },
  { phase: 'glide', kind: 'glide', air: STILL_AIR },
  { phase: 'ridge', kind: 'climb', airspeed: CLIMB_SPEEDS.ridge },
  { phase: 'wave', kind: 'climb', airspeed: CLIMB_SPEEDS.wave },
  { phase: 'final', kind: 'glide', air: WAVE_SINK },
  { phase: 'final', kind: 'glide', air: STILL_AIR },
];

export const LEGS: readonly Leg[] = LEG_SPECS.map((spec, index) => {
  const from = KEYFRAMES[index];
  const to = KEYFRAMES[index + 1];
  return {
    ...spec,
    start: from.time,
    end: to.time,
    startHeight: from.height,
    endHeight: to.height,
    climb: (to.height - from.height) / (to.time - from.time),
  };
});

const WRAP_OFFSETS = [-FLIGHT_CYCLE, 0, FLIGHT_CYCLE] as const;

export function flightTime(phase: number): number {
  return wrapPhase(phase, FLIGHT_CYCLE);
}

export function legAt(phase: number): Leg {
  const time = flightTime(phase);
  return LEGS.find((leg) => time >= leg.start && time < leg.end) ?? LEGS[0];
}

export function phaseAt(phase: number): PhaseId {
  return legAt(phase).phase;
}

function linearHeight(leg: Leg, time: number): number {
  return lerp(leg.startHeight, leg.endHeight, (time - leg.start) / (leg.end - leg.start));
}

export function windowAverage(phase: number, integral: LegIntegral): number {
  const center = flightTime(phase);
  const from = center - TRANSITION_SECONDS / 2;
  const to = center + TRANSITION_SECONDS / 2;
  let total = 0;
  for (const offset of WRAP_OFFSETS) {
    for (const leg of LEGS) {
      const start = Math.max(from, leg.start + offset);
      const end = Math.min(to, leg.end + offset);
      if (end > start) total += integral(leg, start - offset, end - offset);
    }
  }
  return total / TRANSITION_SECONDS;
}

export function heightAt(phase: number): number {
  return windowAverage(phase, (leg, from, to) => (to - from) * linearHeight(leg, (from + to) / 2));
}

export function climbAt(phase: number): number {
  return windowAverage(phase, (leg, from, to) => (to - from) * leg.climb);
}
