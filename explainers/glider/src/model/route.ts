import { FULL_TURN, toRadians, wrapAngle } from '@core/math';
import { Route, arc, line, rampedShare } from './path';
import type { Pose } from './path';
import { PHASE_RANGES, flightTime, heightAt } from './story';
import type { TimeRange } from './story';

interface TrackSegment extends TimeRange {
  pose(time: number): Pose;
  turn(time: number): number;
}

interface Ramps {
  rampIn?: number;
  rampOut?: number;
}

export const THERMAL_CIRCLE = { radius: 48, turns: 2.5, driftPerMetre: 0.011, ramp: 0.1 } as const;
export const RIDGE_CREST_X = 0;
export const WAVE_HOLD_X = 60;

const FIELD_X = -160;
const RIDGE_BEATS = { closestX: -14, length: 116, turnRadius: 14, count: 4, rampIn: 0.08 } as const;
const WAVE_TRANSIT = { seconds: 150, rampOut: 0.35 } as const;
const HOME_RAMP_IN = 0.05;
const TURN_BANK = toRadians(45);
const BANK_WINDOW = { seconds: 12, samples: 32 } as const;
const LEVEL_PITCH_SPEED = 90;
const FAST_PITCH = { speed: 200, pitch: toRadians(-6) } as const;
const ENTRY_ANGLE = Math.PI / 2;
const ORIGIN: Pose = { x: 0, z: 0, heading: 0 };

const BEAT_DRIFT = Math.atan2(2 * RIDGE_BEATS.turnRadius, RIDGE_BEATS.length);
const ONTO_RIDGE = Math.PI / 2 - BEAT_DRIFT;
const U_TURN = Math.PI + 2 * BEAT_DRIFT;

function ridgeStart(): Pose {
  const onto = new Route(ORIGIN, [arc(RIDGE_BEATS.turnRadius, ONTO_RIDGE)]).end;
  const beatEnd = new Route(onto, [line(RIDGE_BEATS.length)]).end;
  return {
    x: RIDGE_BEATS.closestX - beatEnd.x,
    z: -(onto.z + beatEnd.z) / 2,
    heading: 0,
  };
}

function ridgeRoute(start: Pose): Route {
  const { turnRadius, length, count } = RIDGE_BEATS;
  const beats = Array.from({ length: count }, (_, index) => {
    if (index === count - 1) return [line(length)];
    return [line(length), arc(turnRadius, index % 2 === 0 ? U_TURN : -U_TURN)];
  }).flat();
  return new Route(start, [arc(turnRadius, ONTO_RIDGE), ...beats, arc(turnRadius, ONTO_RIDGE)]);
}

const RIDGE_START = ridgeStart();

const PLAN_FIELD_Z = RIDGE_START.z + THERMAL_CIRCLE.radius;

export const FIELD = { x: FIELD_X, z: -PLAN_FIELD_Z } as const;

export function thermalAxisX(height: number): number {
  return FIELD.x + THERMAL_CIRCLE.driftPerMetre * height;
}

function thermalRoute(): Route {
  const { radius, turns } = THERMAL_CIRCLE;
  const entry: Pose = {
    x: radius * Math.cos(ENTRY_ANGLE),
    z: PLAN_FIELD_Z + radius * Math.sin(ENTRY_ANGLE),
    heading: ENTRY_ANGLE + Math.PI / 2,
  };
  return new Route(entry, [arc(radius, FULL_TURN * turns)]);
}

function settled(pose: Pose): Pose {
  return { ...pose, heading: wrapAngle(pose.heading) };
}

function routeSegment(range: TimeRange, route: Route, ramps: Ramps = {}): TrackSegment {
  const { rampIn = 0, rampOut = 0 } = ramps;
  const duration = range.end - range.start;
  const share = (time: number) => rampedShare((time - range.start) / duration, rampIn, rampOut);
  return {
    ...range,
    pose: (time) => route.poseAt(share(time)),
    turn: (time) => route.turnAt(share(time)),
  };
}

function drifting(segment: TrackSegment): TrackSegment {
  return {
    ...segment,
    pose: (time) => {
      const pose = segment.pose(time);
      return { ...pose, x: pose.x + thermalAxisX(heightAt(time)) };
    },
  };
}

const THERMAL_SEGMENT = drifting(
  routeSegment(PHASE_RANGES.thermal, thermalRoute(), {
    rampIn: THERMAL_CIRCLE.ramp,
    rampOut: THERMAL_CIRCLE.ramp,
  }),
);
const THERMAL_ENTRY = settled(THERMAL_SEGMENT.pose(PHASE_RANGES.thermal.start));
const THERMAL_EXIT = settled(THERMAL_SEGMENT.pose(PHASE_RANGES.thermal.end));
const GLIDE_ROUTE = new Route(THERMAL_EXIT, [line(RIDGE_START.x - THERMAL_EXIT.x)]);
const RIDGE_ROUTE = ridgeRoute(RIDGE_START);
const TRANSIT_ROUTE = new Route(RIDGE_ROUTE.end, [
  line(WAVE_HOLD_X - RIDGE_ROUTE.end.x),
  arc(THERMAL_CIRCLE.radius, Math.PI),
]);
const WAVE_HOLD = settled(TRANSIT_ROUTE.end);
const HOME_ROUTE = new Route(WAVE_HOLD, [line(WAVE_HOLD.x - THERMAL_ENTRY.x)]);
const HOLD_START = PHASE_RANGES.wave.start + WAVE_TRANSIT.seconds;

const TRACK: readonly TrackSegment[] = [
  THERMAL_SEGMENT,
  routeSegment(PHASE_RANGES.glide, GLIDE_ROUTE),
  routeSegment(PHASE_RANGES.ridge, RIDGE_ROUTE, { rampIn: RIDGE_BEATS.rampIn }),
  routeSegment({ start: PHASE_RANGES.wave.start, end: HOLD_START }, TRANSIT_ROUTE, {
    rampOut: WAVE_TRANSIT.rampOut,
  }),
  { start: HOLD_START, end: PHASE_RANGES.wave.end, pose: () => WAVE_HOLD, turn: () => 0 },
  routeSegment(PHASE_RANGES.final, HOME_ROUTE, { rampIn: HOME_RAMP_IN }),
];

function planToWorld(pose: Pose): Pose {
  return { x: pose.x, z: -pose.z, heading: -pose.heading };
}

function segmentAt(time: number): TrackSegment {
  return TRACK.find((candidate) => time < candidate.end) ?? TRACK[TRACK.length - 1];
}

export function poseAt(phase: number): Pose {
  const time = flightTime(phase);
  return planToWorld(segmentAt(time).pose(time));
}

function worldTurnAt(phase: number): number {
  const time = flightTime(phase);
  return -segmentAt(time).turn(time);
}

function turnShareAt(phase: number): number {
  const { seconds, samples } = BANK_WINDOW;
  const spacing = seconds / samples;
  const first = phase - seconds / 2 + spacing / 2;
  let total = 0;
  for (let index = 0; index < samples; index++) total += worldTurnAt(first + index * spacing);
  return total / samples;
}

export function bankAt(phase: number): number {
  return TURN_BANK * turnShareAt(phase);
}

export function pitchFor(airspeed: number): number {
  const share = (airspeed - LEVEL_PITCH_SPEED) / (FAST_PITCH.speed - LEVEL_PITCH_SPEED);
  return share * FAST_PITCH.pitch;
}
