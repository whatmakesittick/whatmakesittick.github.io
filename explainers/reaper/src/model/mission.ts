import { clamp } from '@core/math';
import type { LinkMode, MomentId, PhaseId } from '../ids';
import { LIFTOFF_DISTANCE, TAKEOFF_PHASE_DISTANCE } from './layout';

export interface Segment {
  units: readonly [start: number, end: number];
  minutes: readonly [start: number, end: number];
}

export const MISSION_UNITS = 100;
export const RUN_SECONDS_AT_NORMAL_SPEED = 90;
export const BASE_UNITS_PER_SECOND = MISSION_UNITS / RUN_SECONDS_AT_NORMAL_SPEED;

export const HANDOVER_MIN = 30;
export const LAUNCH_MIN = 480;
export const MISSILE_FLIGHT_S = 25;
export const HANDBACK_MIN = 535;
export const TOUCHDOWN_MIN = 550;
export const MISSION_END_MIN = 555;

export const SEGMENTS: readonly Segment[] = [
  { units: [0, 10], minutes: [0, 2] },
  { units: [10, 25], minutes: [2, 20] },
  { units: [25, 40], minutes: [20, 90] },
  { units: [40, 62], minutes: [90, LAUNCH_MIN] },
  { units: [62, 78], minutes: [LAUNCH_MIN, LAUNCH_MIN + 0.5] },
  { units: [78, 96], minutes: [LAUNCH_MIN + 0.5, TOUCHDOWN_MIN] },
  { units: [96, MISSION_UNITS], minutes: [TOUCHDOWN_MIN, MISSION_END_MIN] },
];

export const PHASE_RANGES: Record<PhaseId, { start: number; end: number }> = {
  takeoff: { start: 0, end: 10 },
  climb: { start: 10, end: 25 },
  handover: { start: 25, end: 40 },
  loiter: { start: 40, end: 62 },
  strike: { start: 62, end: 78 },
  return: { start: 78, end: MISSION_UNITS },
};

function segmentShare(value: number, range: readonly [number, number]): number {
  return (value - range[0]) / (range[1] - range[0]);
}

function lerpRange(share: number, range: readonly [number, number]): number {
  return range[0] + share * (range[1] - range[0]);
}

export function segmentAt(units: number): Segment {
  const value = clamp(units, 0, MISSION_UNITS);
  return SEGMENTS.find((segment) => value <= segment.units[1]) ?? SEGMENTS[SEGMENTS.length - 1];
}

export function minutesAt(units: number): number {
  const value = clamp(units, 0, MISSION_UNITS);
  const segment = segmentAt(value);
  return lerpRange(segmentShare(value, segment.units), segment.minutes);
}

export function unitsAt(minutes: number): number {
  const value = clamp(minutes, 0, MISSION_END_MIN);
  const segment =
    SEGMENTS.find((candidate) => value <= candidate.minutes[1]) ?? SEGMENTS[SEGMENTS.length - 1];
  return lerpRange(segmentShare(value, segment.minutes), segment.units);
}

export function phaseAt(units: number): PhaseId {
  const value = clamp(units, 0, MISSION_UNITS);
  const found = (Object.keys(PHASE_RANGES) as PhaseId[]).find((id) => value < PHASE_RANGES[id].end);
  return found ?? 'return';
}

export function phaseShareAt(units: number): number {
  const { start, end } = PHASE_RANGES[phaseAt(units)];
  return clamp((units - start) / (end - start), 0, 1);
}

export function linkAt(minutes: number): LinkMode {
  return minutes >= HANDOVER_MIN && minutes < HANDBACK_MIN ? 'sat' : 'los';
}

const LIFTOFF_UNITS =
  PHASE_RANGES.takeoff.end * Math.sqrt(LIFTOFF_DISTANCE / TAKEOFF_PHASE_DISTANCE);

export const MOMENTS: Record<MomentId, number> = {
  liftoff: LIFTOFF_UNITS,
  handover: unitsAt(HANDOVER_MIN),
  onStation: PHASE_RANGES.loiter.start,
  launch: PHASE_RANGES.strike.start,
  impact: unitsAt(LAUNCH_MIN + MISSILE_FLIGHT_S / 60),
  handback: unitsAt(HANDBACK_MIN),
  touchdown: unitsAt(TOUCHDOWN_MIN),
};
