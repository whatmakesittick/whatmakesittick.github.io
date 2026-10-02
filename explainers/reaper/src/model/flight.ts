import { FULL_TURN, clamp, lerp, smoothstep } from '@core/math';
import { Route, arc, line } from '@core/path';
import type { Pose } from '@core/path';
import type { FlightReading, Point } from '../ids';
import {
  AIRCRAFT,
  AIRSPEED_KMH,
  BANK_BLEND_DISTANCE,
  BANK_MAX,
  CLIMB_END_DISTANCE,
  CLIMB_PHASE_DISTANCE,
  CRUISE_ALTITUDE,
  DESCENT_LENGTH,
  FINAL_LENGTH,
  LIFTOFF_DISTANCE,
  LOITER,
  LOITER_CIRCUMFERENCE,
  PITCH_SHARE,
  RETURN_LEG,
  ROLLOUT_DISTANCE,
  RUNWAY,
  S_TURN_RADIUS,
  TAKEOFF_PHASE_DISTANCE,
  THRESHOLD,
} from './layout';
import { MISSION_UNITS, PHASE_RANGES, SEGMENTS } from './mission';
import { unitsToMetres } from './scale';

const QUARTER_TURN = Math.PI / 2;

const START: Pose = { x: THRESHOLD[0], z: THRESHOLD[2], heading: RUNWAY.heading };

export const ROUTE = new Route(START, [
  line(LOITER.entry[0] - THRESHOLD[0]),
  arc(LOITER.radius, LOITER.laps * FULL_TURN),
  line(RETURN_LEG.length),
  arc(S_TURN_RADIUS, QUARTER_TURN),
  arc(S_TURN_RADIUS, -QUARTER_TURN),
  line(FINAL_LENGTH),
]);

export const ROUTE_LENGTH = ROUTE.length;
export const ORBIT_ENTRY_DISTANCE = LOITER.entry[0] - THRESHOLD[0];
export const ORBIT_EXIT_DISTANCE = ORBIT_ENTRY_DISTANCE + LOITER.laps * LOITER_CIRCUMFERENCE;
export const STRIKE_START_DISTANCE =
  ORBIT_ENTRY_DISTANCE + LOITER.lapsBeforeStrike * LOITER_CIRCUMFERENCE;
export const STRIKE_END_DISTANCE =
  STRIKE_START_DISTANCE + LOITER.lapsDuringStrike * LOITER_CIRCUMFERENCE;
export const TOUCHDOWN_DISTANCE = ROUTE_LENGTH - ROLLOUT_DISTANCE;
export const DESCENT_START_DISTANCE = TOUCHDOWN_DISTANCE - DESCENT_LENGTH;
const PROP_SPIN_DOWN_DISTANCE = 40;
const PROP_IDLE_RATE = 0.3;
const GEAR_UP_START = LIFTOFF_DISTANCE + 20;
const GEAR_UP_END = LIFTOFF_DISTANCE + 60;
const GEAR_DOWN_START = TOUCHDOWN_DISTANCE - 250;
const GEAR_DOWN_END = TOUCHDOWN_DISTANCE - 210;
const SPEED_BLEND_SHARE = 0.3;
const LIFTOFF_SHARE = Math.sqrt(LIFTOFF_DISTANCE / TAKEOFF_PHASE_DISTANCE);
const ROLL_END_SPEED = AIRSPEED_KMH.liftoff / LIFTOFF_SHARE;

const DISTANCE_MARKS: readonly number[] = [
  0,
  TAKEOFF_PHASE_DISTANCE,
  CLIMB_PHASE_DISTANCE,
  ORBIT_ENTRY_DISTANCE,
  STRIKE_START_DISTANCE,
  STRIKE_END_DISTANCE,
  TOUCHDOWN_DISTANCE,
  ROUTE_LENGTH,
];

interface SpeedTarget {
  from: number;
  to: number;
}

const SPEED_TARGETS: readonly SpeedTarget[] = [
  { from: 0, to: ROLL_END_SPEED },
  { from: ROLL_END_SPEED, to: AIRSPEED_KMH.climb },
  { from: AIRSPEED_KMH.climb, to: AIRSPEED_KMH.cruise },
  { from: AIRSPEED_KMH.cruise, to: AIRSPEED_KMH.loiter },
  { from: AIRSPEED_KMH.loiter, to: AIRSPEED_KMH.loiter },
  { from: AIRSPEED_KMH.cruise, to: AIRSPEED_KMH.touchdown },
  { from: AIRSPEED_KMH.touchdown, to: 0 },
];

function segmentIndexAt(units: number): number {
  const value = clamp(units, 0, MISSION_UNITS);
  const index = SEGMENTS.findIndex((segment) => value <= segment.units[1]);
  return index < 0 ? SEGMENTS.length - 1 : index;
}

function segmentShareAt(units: number, index: number): number {
  const [start, end] = SEGMENTS[index].units;
  return clamp((units - start) / (end - start), 0, 1);
}

function distanceShare(index: number, share: number): number {
  if (index === 0) return share * share;
  if (index === SEGMENTS.length - 1) return 1 - (1 - share) * (1 - share);
  return share;
}

export function distanceAt(units: number): number {
  const index = segmentIndexAt(units);
  const share = distanceShare(index, segmentShareAt(units, index));
  return lerp(DISTANCE_MARKS[index], DISTANCE_MARKS[index + 1], share);
}

function sCurve(share: number): number {
  const t = clamp(share, 0, 1);
  return t * t * (3 - 2 * t);
}

function sCurveSlope(share: number): number {
  const t = clamp(share, 0, 1);
  return 6 * t * (1 - t);
}

export function altitudeAt(distance: number): number {
  if (distance <= LIFTOFF_DISTANCE) return 0;
  if (distance < CLIMB_END_DISTANCE) {
    return (
      CRUISE_ALTITUDE *
      sCurve((distance - LIFTOFF_DISTANCE) / (CLIMB_END_DISTANCE - LIFTOFF_DISTANCE))
    );
  }
  if (distance < DESCENT_START_DISTANCE) return CRUISE_ALTITUDE;
  if (distance < TOUCHDOWN_DISTANCE) {
    return CRUISE_ALTITUDE * (1 - sCurve((distance - DESCENT_START_DISTANCE) / DESCENT_LENGTH));
  }
  return 0;
}

function climbSlopeAt(distance: number): number {
  if (distance > LIFTOFF_DISTANCE && distance < CLIMB_END_DISTANCE) {
    const run = CLIMB_END_DISTANCE - LIFTOFF_DISTANCE;
    return (CRUISE_ALTITUDE / run) * sCurveSlope((distance - LIFTOFF_DISTANCE) / run);
  }
  if (distance > DESCENT_START_DISTANCE && distance < TOUCHDOWN_DISTANCE) {
    return (
      -(CRUISE_ALTITUDE / DESCENT_LENGTH) *
      sCurveSlope((distance - DESCENT_START_DISTANCE) / DESCENT_LENGTH)
    );
  }
  return 0;
}

function turnAtDistance(distance: number): number {
  return ROUTE.turnAt(clamp(distance, 0, ROUTE_LENGTH) / ROUTE_LENGTH);
}

function bankAt(distance: number): number {
  const samples = [-1, 0, 1].map((offset) =>
    turnAtDistance(distance + offset * BANK_BLEND_DISTANCE),
  );
  const turn = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return BANK_MAX * turn;
}

function gearAt(distance: number): number {
  const up = 1 - smoothstep(distance, GEAR_UP_START, GEAR_UP_END);
  const down = smoothstep(distance, GEAR_DOWN_START, GEAR_DOWN_END);
  return Math.max(up, down);
}

function propRateAt(distance: number): number {
  const spinDown = smoothstep(distance, ROUTE_LENGTH - PROP_SPIN_DOWN_DISTANCE, ROUTE_LENGTH);
  return lerp(1, PROP_IDLE_RATE, spinDown);
}

function airspeedAt(index: number, share: number, altitude: number): number {
  const target = SPEED_TARGETS[index];
  if (index === 0) return lerp(target.from, target.to, share);
  if (index === SEGMENTS.length - 1) return lerp(target.from, target.to, share);
  if (index === SEGMENTS.length - 2) {
    return lerp(target.to, target.from, altitude / CRUISE_ALTITUDE);
  }
  return lerp(target.from, target.to, smoothstep(share, 0, SPEED_BLEND_SHARE));
}

export function flightAt(units: number): FlightReading {
  const index = segmentIndexAt(units);
  const share = segmentShareAt(units, index);
  const distance = distanceAt(units);
  const pose = ROUTE.poseAt(distance / ROUTE_LENGTH);
  const altitude = altitudeAt(distance);
  const onGround = distance <= LIFTOFF_DISTANCE || distance >= TOUCHDOWN_DISTANCE;
  const position: Point = [pose.x, altitude + AIRCRAFT.restHeight, pose.z];
  return {
    position,
    heading: pose.heading,
    pitch: Math.atan(climbSlopeAt(distance)) * PITCH_SHARE,
    bank: onGround ? 0 : bankAt(distance),
    gear: gearAt(distance),
    propRate: propRateAt(distance),
    airspeed: airspeedAt(index, share, altitude),
    altitude: unitsToMetres(altitude),
    onGround,
  };
}

export function isOnStation(units: number): boolean {
  return units >= PHASE_RANGES.loiter.start && distanceAt(units) < ORBIT_EXIT_DISTANCE;
}
