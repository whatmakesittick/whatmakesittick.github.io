import { clamp, lerp, toRadians, wrapAngle } from '@core/math';
import { Route, arc, line } from '@core/path';
import type { FlightReading, PhaseId, Point } from '../ids';
import { CRUISE_TILT_DEG } from './figures';
import {
  CRUISE_HEIGHT,
  FINAL_LENGTH,
  HOMEBOUND_LENGTH,
  HOVER_HEIGHT,
  ORBIT,
  ORBIT_HEIGHT,
  ORBIT_LENGTH,
  OUTBOUND_LENGTH,
  PAD,
  ROUTE_STEPS,
  SPEED_KMH,
  START_HEADING,
  S_TURN_LENGTH,
  S_TURN_RADIUS,
} from './layout';
import { Profile } from './profile';
import type { Knot } from './profile';
import { GRAVITY, toKmh, toMetresPerSecond } from './scale';
import { MOMENTS, PHASE_RANGES, SORTIE_SECONDS, clampSeconds, phaseAt } from './sortie';

export interface FlightMotion extends FlightReading {
  acceleration: number;
  headingRate: number;
  pitchRate: number;
  rollRate: number;
}

interface Arc {
  from: number;
  to: number;
  turn: number;
  radius: number;
}

interface DistanceRange {
  from: number;
  to: number;
}

export const ROUTE = new Route({ x: PAD[0], z: PAD[2], heading: START_HEADING }, [
  line(OUTBOUND_LENGTH),
  arc(ORBIT.radius, ROUTE_STEPS.orbitTurn),
  line(HOMEBOUND_LENGTH),
  arc(S_TURN_RADIUS, ROUTE_STEPS.sTurnFirst),
  arc(S_TURN_RADIUS, ROUTE_STEPS.sTurnSecond),
  line(FINAL_LENGTH),
]);

export const CLIMB_LENGTH = 78;
export const ORBIT_ENTRY_DISTANCE = OUTBOUND_LENGTH;
export const ORBIT_EXIT_DISTANCE = ORBIT_ENTRY_DISTANCE + ORBIT_LENGTH;
export const S_TURN_START_DISTANCE = ORBIT_EXIT_DISTANCE + HOMEBOUND_LENGTH;
export const S_TURN_MIDDLE_DISTANCE = S_TURN_START_DISTANCE + S_TURN_LENGTH / 2;
export const FINAL_START_DISTANCE = S_TURN_START_DISTANCE + S_TURN_LENGTH;

export const ATTITUDE_BLEND_S = 0.6;
export const HOVER_STOP_S = 75;
const HOVER_HOLD_S = 1;
const ORBIT_SPEED_BLEND_S = 2;
const HEIGHT_BLEND_S = 3;
const RETURN_SPEED_BLEND_S = 3;
const PROP_SPIN_UP_S = 1.5;
const PROP_IDLE_RATE = 0.5;
const RATE_STEP_S = 0.05;
const MIN_WINDOW_M = 1e-6;

const CRUISE_MPS = toMetresPerSecond(SPEED_KMH.cruise);
const ORBIT_MPS = toMetresPerSecond(SPEED_KMH.orbit);

export const DRAG_ACCEL_PER_SPEED_SQ =
  (GRAVITY * Math.tan(toRadians(CRUISE_TILT_DEG))) / CRUISE_MPS ** 2;

export const PHASE_DISTANCES: Readonly<Record<PhaseId, DistanceRange>> = {
  takeoff: { from: 0, to: 0 },
  climb: { from: 0, to: CLIMB_LENGTH },
  transit: { from: CLIMB_LENGTH, to: ORBIT_ENTRY_DISTANCE },
  orbit: { from: ORBIT_ENTRY_DISTANCE, to: ORBIT_EXIT_DISTANCE },
  return: { from: ORBIT_EXIT_DISTANCE, to: FINAL_START_DISTANCE },
  landing: { from: FINAL_START_DISTANCE, to: ROUTE.length },
};

const SPEED_KNOTS: readonly Knot[] = [
  [0, 0],
  [PHASE_RANGES.climb.start, 0],
  [PHASE_RANGES.climb.end, CRUISE_MPS],
  [PHASE_RANGES.orbit.start, CRUISE_MPS],
  [PHASE_RANGES.orbit.start + ORBIT_SPEED_BLEND_S, ORBIT_MPS],
  [PHASE_RANGES.orbit.end, ORBIT_MPS],
  [PHASE_RANGES.orbit.end + RETURN_SPEED_BLEND_S, CRUISE_MPS],
  [PHASE_RANGES.return.end, CRUISE_MPS],
  [HOVER_STOP_S, 0],
  [SORTIE_SECONDS, 0],
];

const HEIGHT_KNOTS: readonly Knot[] = [
  [0, 0],
  [MOMENTS.liftoff, 0],
  [PHASE_RANGES.climb.start, HOVER_HEIGHT],
  [PHASE_RANGES.climb.end, CRUISE_HEIGHT],
  [PHASE_RANGES.orbit.start, CRUISE_HEIGHT],
  [PHASE_RANGES.orbit.start + HEIGHT_BLEND_S, ORBIT_HEIGHT],
  [PHASE_RANGES.orbit.end, ORBIT_HEIGHT],
  [PHASE_RANGES.orbit.end + HEIGHT_BLEND_S, CRUISE_HEIGHT],
  [PHASE_RANGES.return.end, CRUISE_HEIGHT],
  [HOVER_STOP_S, HOVER_HEIGHT],
  [HOVER_STOP_S + HOVER_HOLD_S, HOVER_HEIGHT],
  [MOMENTS.touchdown, 0],
  [SORTIE_SECONDS, 0],
];

const PROP_KNOTS: readonly Knot[] = [
  [0, 0],
  [PROP_SPIN_UP_S, PROP_IDLE_RATE],
  [MOMENTS.liftoff, 1],
  [MOMENTS.touchdown, 1],
  [SORTIE_SECONDS, 0],
];

const SPEED = new Profile(SPEED_KNOTS);
const HEIGHT = new Profile(HEIGHT_KNOTS);
const PROPS = new Profile(PROP_KNOTS);

const ARCS: readonly Arc[] = [
  {
    from: ORBIT_ENTRY_DISTANCE,
    to: ORBIT_EXIT_DISTANCE,
    turn: Math.sign(ROUTE_STEPS.orbitTurn),
    radius: ORBIT.radius,
  },
  {
    from: S_TURN_START_DISTANCE,
    to: S_TURN_MIDDLE_DISTANCE,
    turn: Math.sign(ROUTE_STEPS.sTurnFirst),
    radius: S_TURN_RADIUS,
  },
  {
    from: S_TURN_MIDDLE_DISTANCE,
    to: FINAL_START_DISTANCE,
    turn: Math.sign(ROUTE_STEPS.sTurnSecond),
    radius: S_TURN_RADIUS,
  },
];

export function speedAt(seconds: number): number {
  return SPEED.at(clampSeconds(seconds));
}

export function heightAt(seconds: number): number {
  return HEIGHT.at(clampSeconds(seconds));
}

export function distanceFlownAt(seconds: number): number {
  const time = clampSeconds(seconds);
  const phase = phaseAt(time);
  const { start, end } = PHASE_RANGES[phase];
  const { from, to } = PHASE_DISTANCES[phase];
  const run = SPEED.integralTo(end) - SPEED.integralTo(start);
  if (run <= 0) return from;
  const flown = SPEED.integralTo(clamp(time, start, end)) - SPEED.integralTo(start);
  return lerp(from, to, flown / run);
}

export function pitchAt(seconds: number): number {
  const speed = speedAt(seconds);
  const acceleration = SPEED.slopeAt(clampSeconds(seconds));
  return Math.atan((acceleration + DRAG_ACCEL_PER_SPEED_SQ * speed * speed) / GRAVITY);
}

function bankIn(arc: Arc, speed: number): number {
  return arc.turn * Math.atan((speed * speed) / (GRAVITY * arc.radius));
}

function overlapShare(arc: Arc, from: number, to: number): number {
  const width = to - from;
  if (width < MIN_WINDOW_M) return from >= arc.from && from < arc.to ? 1 : 0;
  return clamp(Math.min(to, arc.to) - Math.max(from, arc.from), 0, width) / width;
}

export function rollAt(seconds: number): number {
  const half = ATTITUDE_BLEND_S / 2;
  const from = distanceFlownAt(seconds - half);
  const to = distanceFlownAt(seconds + half);
  const speed = speedAt(seconds);
  return ARCS.reduce((roll, arc) => roll + overlapShare(arc, from, to) * bankIn(arc, speed), 0);
}

export function headingAt(seconds: number): number {
  return ROUTE.poseAt(distanceFlownAt(seconds) / ROUTE.length).heading;
}

function rateOf(read: (seconds: number) => number, seconds: number): number {
  return wrapAngle(read(seconds + RATE_STEP_S) - read(seconds - RATE_STEP_S)) / (2 * RATE_STEP_S);
}

export function isArmedAt(seconds: number): boolean {
  return seconds >= 0 && seconds < SORTIE_SECONDS;
}

export function flightAt(seconds: number): FlightMotion {
  const time = clampSeconds(seconds);
  const pose = ROUTE.poseAt(distanceFlownAt(time) / ROUTE.length);
  const height = HEIGHT.at(time);
  const position: Point = [pose.x, height, pose.z];
  return {
    position,
    heading: pose.heading,
    pitch: pitchAt(time),
    roll: rollAt(time),
    speedKmh: toKmh(SPEED.at(time)),
    height,
    verticalSpeed: HEIGHT.slopeAt(time),
    onGround: height <= 0,
    armed: isArmedAt(seconds),
    propRate: PROPS.at(time),
    acceleration: SPEED.slopeAt(time),
    headingRate: rateOf(headingAt, time),
    pitchRate: rateOf(pitchAt, time),
    rollRate: rateOf(rollAt, time),
  };
}
