import { clamp, lerp, smoothstep, toRadians } from '@core/math';
import { Route, arc, line } from '@core/path';
import type { BoatReading, CompanionReading, MomentId, PhaseId, Point, RoutePose } from '../ids';
import { HULL_SPEED_KN, HUMP_PEAK_KN, PLANING_FROM_KN } from './hull';
import { firstCrossing, integralTo, valueAt } from './keyframes';
import type { Keyframes } from './keyframes';
import { BOAT, FINAL_HEADING, FORMATION, ROUTE_TURN, SHIP, START } from './layout';
import type { Box } from './layout';
import { knotsToMs } from './scale';

export const RUN_SECONDS = 120;
export const HELD_PHASE = 60;

export const PHASE_RANGES: Readonly<Record<PhaseId, { start: number; end: number }>> = {
  launch: { start: 0, end: 15 },
  hump: { start: 15, end: 36 },
  cruise: { start: 36, end: 78 },
  sprint: { start: 78, end: 112 },
  arrival: { start: 112, end: RUN_SECONDS },
};

export const SPEED_KEYS: Keyframes = [
  [0, 0],
  [5, 3],
  [15, 4],
  [22, 7],
  [28, 11],
  [34, 17],
  [40, 22],
  [78, 22],
  [88, 42],
  [120, 42],
];

export const RUN_STEER = toRadians(8);
const STEER_EASE_SECONDS = 0.5;
const BISECTION_STEPS = 48;
const MIN_FORWARD_SPEED = 0.1;
const SIDES = [-1, 1] as const;
const SMOOTHSTEP_SLOPE = 6;

function runTime(t: number): number {
  return clamp(t, 0, RUN_SECONDS);
}

export function speedAt(t: number): number {
  return valueAt(SPEED_KEYS, runTime(t));
}

export function distanceAt(t: number): number {
  return knotsToMs(integralTo(SPEED_KEYS, runTime(t)));
}

export const RUN_DISTANCE = distanceAt(RUN_SECONDS);

export function timeAtDistance(distance: number): number {
  const target = clamp(distance, 0, RUN_DISTANCE);
  let low = 0;
  let high = RUN_SECONDS;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (distanceAt(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function timeAtKnots(knots: number): number {
  return firstCrossing(SPEED_KEYS, knots);
}

const ARC_LENGTH = ROUTE_TURN.radius * Math.abs(ROUTE_TURN.turn);

export const TURN_START_DISTANCE = ROUTE_TURN.lead;
export const TURN_END_DISTANCE = ROUTE_TURN.lead + ARC_LENGTH;
export const FINAL_LENGTH = RUN_DISTANCE - TURN_END_DISTANCE;

export const ROUTE = new Route(START, [
  line(ROUTE_TURN.lead),
  arc(ROUTE_TURN.radius, ROUTE_TURN.turn),
  line(FINAL_LENGTH),
]);

export const TURN_START_TIME = timeAtDistance(TURN_START_DISTANCE);
export const TURN_END_TIME = timeAtDistance(TURN_END_DISTANCE);

export const ROUTE_END: Point = [ROUTE.end.x, 0, ROUTE.end.z];

const SHIP_SIDE_GAP = BOAT.halfLength + SHIP.beam / 2;

export const SHIP_CENTRE: Point = [
  ROUTE_END[0] + SHIP_SIDE_GAP * Math.cos(FINAL_HEADING),
  0,
  ROUTE_END[2] + SHIP_SIDE_GAP * Math.sin(FINAL_HEADING),
];

export const SHIP_HEADING = FINAL_HEADING + Math.PI / 2;

export const SHIP_BOUNDS: Box = {
  x: [SHIP_CENTRE[0] - SHIP.reach, SHIP_CENTRE[0] + SHIP.reach],
  y: [-SHIP.draft, SHIP.mastTop + 2],
  z: [SHIP_CENTRE[2] - SHIP.reach, SHIP_CENTRE[2] + SHIP.reach],
};

export function poseAtDistance(distance: number): RoutePose {
  const pose = ROUTE.poseAt(clamp(distance, 0, ROUTE.length) / ROUTE.length);
  return { position: [pose.x, 0, pose.z], heading: pose.heading };
}

export function boatAt(t: number): BoatReading {
  const distance = distanceAt(t);
  return { ...poseAtDistance(distance), knots: speedAt(t), distance, held: false };
}

export function steerAt(t: number): number {
  const into = smoothstep(
    t,
    TURN_START_TIME - STEER_EASE_SECONDS,
    TURN_START_TIME + STEER_EASE_SECONDS,
  );
  const out = smoothstep(t, TURN_END_TIME - STEER_EASE_SECONDS, TURN_END_TIME + STEER_EASE_SECONDS);
  return Math.sign(ROUTE_TURN.turn) * RUN_STEER * into * (1 - out);
}

export function distanceToShip(t: number): number {
  return RUN_DISTANCE - distanceAt(t);
}

export function phaseAt(t: number): PhaseId {
  const value = runTime(t);
  const found = (Object.keys(PHASE_RANGES) as PhaseId[]).find((id) => value < PHASE_RANGES[id].end);
  return found ?? 'arrival';
}

export function phaseShareAt(t: number): number {
  const { start, end } = PHASE_RANGES[phaseAt(t)];
  return clamp((runTime(t) - start) / (end - start), 0, 1);
}

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  hullSpeed: timeAtKnots(HULL_SPEED_KN),
  humpPeak: timeAtKnots(HUMP_PEAK_KN),
  onPlane: timeAtKnots(PLANING_FROM_KN),
  cruiseSpeed: timeAtKnots(BOAT.cruiseKnots),
  throttleUp: PHASE_RANGES.sprint.start,
  topSpeed: timeAtKnots(BOAT.topKnots),
  alongside: RUN_SECONDS,
};

function joinShare(t: number): number {
  return smoothstep(t, FORMATION.joinStart, FORMATION.joinEnd);
}

function joinShareRate(t: number): number {
  const span = FORMATION.joinEnd - FORMATION.joinStart;
  const share = clamp((t - FORMATION.joinStart) / span, 0, 1);
  return (SMOOTHSTEP_SLOPE * share * (1 - share)) / span;
}

export function companionsAt(t: number): readonly CompanionReading[] {
  if (t < FORMATION.joinStart) return [];
  const side = lerp(FORMATION.joinSide, FORMATION.side, joinShare(t));
  const inwardSpeed = (FORMATION.joinSide - FORMATION.side) * joinShareRate(t);
  const forwardSpeed = Math.max(knotsToMs(speedAt(t)), MIN_FORWARD_SPEED);
  const inward = Math.atan2(inwardSpeed, forwardSpeed);
  const base = poseAtDistance(distanceAt(t) - FORMATION.back);
  const starboardX = -Math.sin(base.heading);
  const starboardZ = Math.cos(base.heading);
  return SIDES.map((sign) => ({
    position: [
      base.position[0] + sign * side * starboardX,
      0,
      base.position[2] + sign * side * starboardZ,
    ] as Point,
    heading: base.heading - sign * inward,
  }));
}
