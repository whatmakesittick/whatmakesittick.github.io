import { clamp, lerp, smoothstep } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { BrakeModeId, MomentId, MotionReading, PhaseId, TopSpeedId } from '../ids';
import {
  ACCEL_HIGH,
  ACCEL_LOW,
  BRAKE_DECEL,
  GAP_MM,
  KMH_300,
  KMH_430,
  LIFT_SECONDS,
  LINE_M,
  SETTLE_SECONDS,
  SKID_DROP_KMH,
  SKID_KMH,
} from './constants';
import { REST_GAP_MM } from './layout';
import { toKmh, toMs } from './scale';

export interface Profile {
  topMs: number;
  accelSeconds: number;
  accelMetres: number;
  cruiseSeconds: number;
  cruiseMetres: number;
  brakeSeconds: number;
  brakeMetres: number;
  tripSeconds: number;
}

export interface PhaseRange {
  start: number;
  end: number;
}

interface Stage {
  endMs: number;
  seconds: number;
  metres: number;
}

interface Segment {
  start: number;
  startMs: number;
  startMetres: number;
  accel: number;
}

interface Travel {
  speedMs: number;
  metres: number;
}

type Knot = readonly [from: number, to: number];

export const RUN_UNITS = 1000;
export const BASE_RIDE_SECONDS = 480;
export const DEFAULT_SPEED = 8;
export const SLOW_SPEED = 2;
export const SPEED_RANGE = { min: 1, max: 32, step: 1, default: DEFAULT_SPEED } as const;

const DEPART_UNITS = 60;
const FULL_SPEED_UNITS = 420;
const BRAKE_START_UNITS = 600;
const STOP_UNITS = 940;
const LIFT_BEGIN_UNITS = 10;
const LIFTED_UNITS = 45;
const SET_DOWN_BEGIN_UNITS = 955;
const TOUCHDOWN_UNITS = 970;

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  liftOff: { start: 0, end: DEPART_UNITS },
  accelerate: { start: DEPART_UNITS, end: FULL_SPEED_UNITS },
  cruise: { start: FULL_SPEED_UNITS, end: BRAKE_START_UNITS },
  brake: { start: BRAKE_START_UNITS, end: STOP_UNITS },
  settle: { start: STOP_UNITS, end: RUN_UNITS },
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  lifted: LIFTED_UNITS,
  fullSpeed: FULL_SPEED_UNITS,
  brakeStart: BRAKE_START_UNITS,
  touchdown: TOUCHDOWN_UNITS,
};

export const TOP_SPEED_KMH: Readonly<Record<TopSpeedId, number>> = {
  kmh430: KMH_430,
  kmh300: KMH_300,
};

const STAGE_ONE_MS = toMs(KMH_300);

function byTopSpeed<T>(read: (id: TopSpeedId) => T): Readonly<Record<TopSpeedId, T>> {
  return { kmh430: read('kmh430'), kmh300: read('kmh300') };
}

function speedChange(startMs: number, endMs: number, accel: number): Stage {
  return {
    endMs,
    seconds: (endMs - startMs) / accel,
    metres: (endMs ** 2 - startMs ** 2) / (2 * accel),
  };
}

function stageOne(topMs: number): Stage {
  return speedChange(0, Math.min(topMs, STAGE_ONE_MS), ACCEL_LOW);
}

function stageTwo(topMs: number): Stage {
  return speedChange(Math.min(topMs, STAGE_ONE_MS), topMs, ACCEL_HIGH);
}

function profileFor(topKmh: number): Profile {
  const topMs = toMs(topKmh);
  const first = stageOne(topMs);
  const second = stageTwo(topMs);
  const braking = speedChange(0, topMs, BRAKE_DECEL);
  const accelSeconds = first.seconds + second.seconds;
  const accelMetres = first.metres + second.metres;
  const cruiseMetres = LINE_M - accelMetres - braking.metres;
  const cruiseSeconds = cruiseMetres / topMs;
  return {
    topMs,
    accelSeconds,
    accelMetres,
    cruiseSeconds,
    cruiseMetres,
    brakeSeconds: braking.seconds,
    brakeMetres: braking.metres,
    tripSeconds: LIFT_SECONDS + accelSeconds + cruiseSeconds + braking.seconds + SETTLE_SECONDS,
  };
}

export const PROFILES: Readonly<Record<TopSpeedId, Profile>> = byTopSpeed((id) =>
  profileFor(TOP_SPEED_KMH[id]),
);

export function rate(speed: number): number {
  return (RUN_UNITS * speed) / BASE_RIDE_SECONDS;
}

export function tripSeconds(topSpeed: TopSpeedId): number {
  return PROFILES[topSpeed].tripSeconds;
}

export function phaseAt(units: number): PhaseId {
  const clamped = clamp(units, 0, RUN_UNITS);
  return PHASE_IDS.find((id) => clamped < PHASE_RANGES[id].end) ?? 'settle';
}

function phaseSeconds(profile: Profile): Readonly<Record<PhaseId, number>> {
  return {
    liftOff: LIFT_SECONDS,
    accelerate: profile.accelSeconds,
    cruise: profile.cruiseSeconds,
    brake: profile.brakeSeconds,
    settle: SETTLE_SECONDS,
  };
}

function clockKnots(profile: Profile): readonly Knot[] {
  const durations = phaseSeconds(profile);
  return PHASE_IDS.reduce<Knot[]>(
    (knots, id) => {
      const [, seconds] = knots[knots.length - 1];
      return [...knots, [PHASE_RANGES[id].end, seconds + durations[id]]];
    },
    [[0, 0]],
  );
}

const UNIT_KNOTS = byTopSpeed((id) => clockKnots(PROFILES[id]));
const SECOND_KNOTS = byTopSpeed((id) =>
  UNIT_KNOTS[id].map(([units, seconds]): Knot => [seconds, units]),
);

function piecewise(knots: readonly Knot[], value: number): number {
  const after = knots.findIndex(([at]) => at > value);
  const index = after === -1 ? knots.length - 1 : Math.max(1, after);
  const [fromAt, fromValue] = knots[index - 1];
  const [toAt, toValue] = knots[index];
  const span = toAt - fromAt;
  return span > 0 ? lerp(fromValue, toValue, clamp((value - fromAt) / span, 0, 1)) : toValue;
}

export function realSecondsAt(units: number, topSpeed: TopSpeedId): number {
  return piecewise(UNIT_KNOTS[topSpeed], units);
}

export function unitsAt(seconds: number, topSpeed: TopSpeedId): number {
  return piecewise(SECOND_KNOTS[topSpeed], seconds);
}

function segmentsFor(profile: Profile): readonly Segment[] {
  const first = stageOne(profile.topMs);
  const brakeStart = profile.accelSeconds + profile.cruiseSeconds;
  return [
    { start: 0, startMs: 0, startMetres: 0, accel: ACCEL_LOW },
    { start: first.seconds, startMs: first.endMs, startMetres: first.metres, accel: ACCEL_HIGH },
    {
      start: profile.accelSeconds,
      startMs: profile.topMs,
      startMetres: profile.accelMetres,
      accel: 0,
    },
    {
      start: brakeStart,
      startMs: profile.topMs,
      startMetres: profile.accelMetres + profile.cruiseMetres,
      accel: -BRAKE_DECEL,
    },
  ];
}

const SEGMENTS = byTopSpeed((id) => segmentsFor(PROFILES[id]));

function stopSeconds({ accelSeconds, cruiseSeconds, brakeSeconds }: Profile): number {
  return accelSeconds + cruiseSeconds + brakeSeconds;
}

function travelAt(seconds: number, topSpeed: TopSpeedId): Travel {
  const time = clamp(seconds, 0, stopSeconds(PROFILES[topSpeed]));
  const segments = SEGMENTS[topSpeed];
  const segment = segments.findLast(({ start }) => start <= time) ?? segments[0];
  const elapsed = time - segment.start;
  const { startMs, startMetres, accel } = segment;
  return {
    speedMs: Math.max(0, startMs + accel * elapsed),
    metres: clamp(startMetres + startMs * elapsed + 0.5 * accel * elapsed ** 2, 0, LINE_M),
  };
}

export function speedAtTime(seconds: number, topSpeed: TopSpeedId): number {
  return travelAt(seconds, topSpeed).speedMs;
}

export function distanceAtTime(seconds: number, topSpeed: TopSpeedId): number {
  return travelAt(seconds, topSpeed).metres;
}

const STANDING_AT_START: Travel = { speedMs: 0, metres: 0 };
const STANDING_AT_END: Travel = { speedMs: 0, metres: LINE_M };

function travelInPhase(phase: PhaseId, units: number, topSpeed: TopSpeedId): Travel {
  if (phase === 'liftOff') return STANDING_AT_START;
  if (phase === 'settle') return STANDING_AT_END;
  return travelAt(realSecondsAt(units, topSpeed) - LIFT_SECONDS, topSpeed);
}

const STOPPING: ReadonlySet<PhaseId> = new Set(['brake', 'settle']);

function liftGap(units: number): number {
  return lerp(REST_GAP_MM, GAP_MM, smoothstep(units, LIFT_BEGIN_UNITS, MOMENTS.lifted));
}

function setDownGap(units: number): number {
  return lerp(GAP_MM, REST_GAP_MM, smoothstep(units, SET_DOWN_BEGIN_UNITS, MOMENTS.touchdown));
}

function skidDownGap(speedKmh: number): number {
  return lerp(GAP_MM, REST_GAP_MM, smoothstep(speedKmh, SKID_KMH, SKID_KMH - SKID_DROP_KMH));
}

function gapFor(phase: PhaseId, units: number, speedKmh: number, brakeMode: BrakeModeId): number {
  if (phase === 'liftOff') return liftGap(units);
  if (brakeMode === 'eddy' && STOPPING.has(phase)) return skidDownGap(speedKmh);
  if (phase === 'settle') return setDownGap(units);
  return GAP_MM;
}

export function gapAt(units: number, topSpeed: TopSpeedId, brakeMode: BrakeModeId): number {
  const phase = phaseAt(units);
  const { speedMs } = travelInPhase(phase, units, topSpeed);
  return gapFor(phase, units, toKmh(speedMs), brakeMode);
}

export function motionAt(
  units: number,
  topSpeed: TopSpeedId,
  brakeMode: BrakeModeId,
): MotionReading {
  const phase = phaseAt(units);
  const { speedMs, metres } = travelInPhase(phase, units, topSpeed);
  const speedKmh = toKmh(speedMs);
  const gapMm = gapFor(phase, units, speedKmh, brakeMode);
  const onSkids = gapMm >= REST_GAP_MM;
  return {
    phase,
    realSeconds: realSecondsAt(units, topSpeed),
    distance: metres,
    speedMs,
    speedKmh,
    gapMm,
    liftMm: REST_GAP_MM - gapMm,
    onSkids,
    sliding: onSkids && speedMs > 0,
  };
}
