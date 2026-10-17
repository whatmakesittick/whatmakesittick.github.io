import { FULL_TURN, clamp } from '@core/math';
import { CORNER_NOZZLE_IDS, NOZZLE_IDS, PHASE_IDS, REAR_NOZZLE_IDS } from '../ids';
import type { CarReading, MomentId, NozzleId, NozzleThrusts, PhaseId } from '../ids';
import {
  SETTLE_DECEL,
  SETTLE_SECONDS,
  SPRINT_ACCEL,
  SPRINT_DISTANCE_M,
  SPRINT_SECONDS,
  SPRINT_THRUST_N,
  boostAccel,
} from './boost';
import {
  BRAKE_DECEL,
  CAR_MASS_KG,
  CORNER_NOZZLE_MAX_N,
  DECK_LAUNCH_SPEED_MS,
  ENTRY_SPEED_MS,
  G,
  HOLD_SECONDS,
  JUMP_HEIGHT_M,
  LANDING_SQUAT_M,
  ROLL_INERTIA_KG_M2,
  ROLL_NOZZLE_N,
  RUN_UP_SPEED_MS,
  RUN_UP_THRUST_N,
  SIXTY_MPH_MS,
  TOUCHDOWN_SPEED_MS,
} from './constants';
import { DECK_END_X, DECK_HEIGHT, DECK_STOP_X, JUMP, RAMP, rampPitch, rampPoint } from './layout';
import { leapAccel, leapSpeedFor, loopAngleAt, loopSpeedAt, loopTimetable, topSpeed } from './loop';
import { rollAngleAt, rollSeconds } from './roll';

export interface PhaseRange {
  start: number;
  end: number;
}

export interface Burn {
  start: number;
  end: number;
  nozzles: readonly NozzleId[];
  thrustEach: number;
}

export interface FallState {
  height: number;
  verticalSpeed: number;
}

export interface RunReading {
  phase: PhaseId;
  car: CarReading;
  nozzles: NozzleThrusts;
  fans: boolean;
}

interface Cushion {
  from: FallState;
  accel: number;
  seconds: number;
}

export const RUN_SECONDS = 23;
export const LAUNCH_HOLD_SECONDS = 0.1;

const LOOP_TIMES = loopTimetable(ENTRY_SPEED_MS, RAMP.radius);
export const LOOP_SECONDS = LOOP_TIMES[LOOP_TIMES.length - 1];
export const TOP_SPEED_MS = topSpeed(ENTRY_SPEED_MS, RAMP.radius);
export const RAMP_SECONDS = LOOP_SECONDS;
export const DECK_BRAKE_DECEL = TOP_SPEED_MS ** 2 / (2 * RAMP.brakeLength);
export const BRAKE_SECONDS = TOP_SPEED_MS / DECK_BRAKE_DECEL;
const PUSH_LENGTH = RAMP.deckLength - RAMP.brakeLength;
export const DECK_ACCEL = DECK_LAUNCH_SPEED_MS ** 2 / (2 * PUSH_LENGTH);
export const DECK_SECONDS = DECK_LAUNCH_SPEED_MS / DECK_ACCEL;
export const DECK_PUSH_N = CAR_MASS_KG * DECK_ACCEL;
const LAUNCH_SPEED = DECK_LAUNCH_SPEED_MS;
const FLIP_ROLL_SECONDS = rollSeconds(ROLL_INERTIA_KG_M2, ROLL_NOZZLE_N);
export const FLIP_SECONDS = LAUNCH_HOLD_SECONDS + FLIP_ROLL_SECONDS;
export const TWIST_SECONDS = rollSeconds(ROLL_INERTIA_KG_M2, ROLL_NOZZLE_N, FULL_TURN);

function freeFall(height: number, upSpeed: number, elapsed: number): FallState {
  return {
    height: height + upSpeed * elapsed - 0.5 * G * elapsed ** 2,
    verticalSpeed: upSpeed - G * elapsed,
  };
}

function cushionFrom(from: FallState, accel: number): Cushion {
  return { from, accel, seconds: (-from.verticalSpeed - TOUCHDOWN_SPEED_MS) / accel };
}

function cushionAt({ from, accel, seconds }: Cushion, elapsed: number): FallState {
  const time = clamp(elapsed, 0, seconds);
  return {
    height: from.height + from.verticalSpeed * time + 0.5 * accel * time ** 2,
    verticalSpeed: from.verticalSpeed + accel * time,
  };
}

const RAMP_START = SPRINT_SECONDS + SETTLE_SECONDS;
const BRAKE_START = RAMP_START + RAMP_SECONDS;
const HOLD_START = BRAKE_START + BRAKE_SECONDS;
const DECK_START = HOLD_START + HOLD_SECONDS;
const FLIP_START = DECK_START + DECK_SECONDS;
const ROLL_START = FLIP_START + LAUNCH_HOLD_SECONDS;
const CATCH_START = FLIP_START + FLIP_SECONDS;

const CATCH_FROM = freeFall(DECK_HEIGHT, 0, FLIP_SECONDS);
const CATCH_ACCEL =
  (CATCH_FROM.verticalSpeed ** 2 - TOUCHDOWN_SPEED_MS ** 2) / (2 * CATCH_FROM.height);
const CATCH = cushionFrom(CATCH_FROM, CATCH_ACCEL);
export const CATCH_SECONDS = CATCH.seconds;
export const CATCH_THRUST_N = CAR_MASS_KG * (G + CATCH_ACCEL);
const TOUCHDOWN = CATCH_START + CATCH_SECONDS;
const TOUCHDOWN_X = DECK_END_X - LAUNCH_SPEED * (TOUCHDOWN - FLIP_START);

const RUN_UP_ACCEL = boostAccel(RUN_UP_THRUST_N);
const RUN_UP_BURN_SECONDS = (RUN_UP_SPEED_MS - LAUNCH_SPEED) / RUN_UP_ACCEL;
const RUN_UP_BURN_M = (RUN_UP_SPEED_MS ** 2 - LAUNCH_SPEED ** 2) / (2 * RUN_UP_ACCEL);
const RUN_UP_SECONDS =
  RUN_UP_BURN_SECONDS + (TOUCHDOWN_X - RUN_UP_BURN_M - JUMP.leapX) / RUN_UP_SPEED_MS;
const LIFT_OFF = TOUCHDOWN + RUN_UP_SECONDS;

export const LEAP_THRUST_N = CORNER_NOZZLE_IDS.length * CORNER_NOZZLE_MAX_N;
const LEAP_ACCEL = leapAccel(LEAP_THRUST_N);
const LEAP_UP_SPEED = leapSpeedFor(JUMP_HEIGHT_M, LEAP_ACCEL);
export const LEAP_SECONDS = LEAP_UP_SPEED / LEAP_ACCEL;
const LEAP_TOP = 0.5 * LEAP_ACCEL * LEAP_SECONDS ** 2;
const TWIST_START = LIFT_OFF + LEAP_SECONDS;
const APEX = TWIST_START + LEAP_UP_SPEED / G;

const LANDING_START_HEIGHT =
  (2 * G * JUMP_HEIGHT_M - TOUCHDOWN_SPEED_MS ** 2) / (2 * (CATCH_ACCEL + G));
const LANDING_START = APEX + Math.sqrt((2 * (JUMP_HEIGHT_M - LANDING_START_HEIGHT)) / G);
const LANDING = cushionFrom(
  freeFall(LEAP_TOP, LEAP_UP_SPEED, LANDING_START - TWIST_START),
  CATCH_ACCEL,
);
export const LANDING_SECONDS = LANDING.seconds;
export const LANDING_THRUST_N = CATCH_THRUST_N;
const LANDED = LANDING_START + LANDING_SECONDS;
const LANDED_X = JUMP.leapX - RUN_UP_SPEED_MS * (LANDED - LIFT_OFF);
const SQUAT_RATE = TOUCHDOWN_SPEED_MS / (LANDING_SQUAT_M * Math.E);

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  sprint: { start: 0, end: SPRINT_SECONDS },
  settle: { start: SPRINT_SECONDS, end: RAMP_START },
  ramp: { start: RAMP_START, end: BRAKE_START },
  brake: { start: BRAKE_START, end: HOLD_START },
  hold: { start: HOLD_START, end: DECK_START },
  deck: { start: DECK_START, end: FLIP_START },
  flip: { start: FLIP_START, end: CATCH_START },
  catch: { start: CATCH_START, end: TOUCHDOWN },
  runUp: { start: TOUCHDOWN, end: LIFT_OFF },
  leap: { start: LIFT_OFF, end: TWIST_START },
  twist: { start: TWIST_START, end: LANDING_START },
  landing: { start: LANDING_START, end: LANDED },
  rest: { start: LANDED, end: RUN_SECONDS },
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  sixty: SPRINT_SECONDS,
  inverted: BRAKE_START,
  held: HOLD_START,
  leavesRamp: FLIP_START,
  rollComplete: CATCH_START,
  touchdown: TOUCHDOWN,
  liftOff: LIFT_OFF,
  apex: APEX,
  twistComplete: TWIST_START + TWIST_SECONDS,
  landed: LANDED,
  stopped: LANDED + RUN_UP_SPEED_MS / BRAKE_DECEL,
};

const LEFT_CORNERS: readonly NozzleId[] = ['cornerFrontLeft', 'cornerRearLeft'];
const RIGHT_CORNERS: readonly NozzleId[] = ['cornerFrontRight', 'cornerRearRight'];
const REAR_COUNT = REAR_NOZZLE_IDS.length;
const CORNER_COUNT = CORNER_NOZZLE_IDS.length;

function rollBurns(start: number, seconds: number): Burn[] {
  const half = start + seconds / 2;
  return [
    { start, end: half, nozzles: LEFT_CORNERS, thrustEach: ROLL_NOZZLE_N },
    { start: half, end: start + seconds, nozzles: RIGHT_CORNERS, thrustEach: ROLL_NOZZLE_N },
  ];
}

export const BURNS: readonly Burn[] = [
  {
    start: 0,
    end: SPRINT_SECONDS,
    nozzles: REAR_NOZZLE_IDS,
    thrustEach: SPRINT_THRUST_N / REAR_COUNT,
  },
  {
    start: DECK_START,
    end: FLIP_START,
    nozzles: REAR_NOZZLE_IDS,
    thrustEach: DECK_PUSH_N / REAR_COUNT,
  },
  ...rollBurns(ROLL_START, FLIP_ROLL_SECONDS),
  {
    start: CATCH_START,
    end: TOUCHDOWN,
    nozzles: CORNER_NOZZLE_IDS,
    thrustEach: CATCH_THRUST_N / CORNER_COUNT,
  },
  {
    start: TOUCHDOWN,
    end: TOUCHDOWN + RUN_UP_BURN_SECONDS,
    nozzles: REAR_NOZZLE_IDS,
    thrustEach: RUN_UP_THRUST_N / REAR_COUNT,
  },
  {
    start: LIFT_OFF,
    end: TWIST_START,
    nozzles: CORNER_NOZZLE_IDS,
    thrustEach: CORNER_NOZZLE_MAX_N,
  },
  ...rollBurns(TWIST_START, TWIST_SECONDS),
  {
    start: LANDING_START,
    end: LANDED,
    nozzles: CORNER_NOZZLE_IDS,
    thrustEach: LANDING_THRUST_N / CORNER_COUNT,
  },
];

export function burnThrust(burn: Burn): number {
  return burn.thrustEach * burn.nozzles.length;
}

function runClock(seconds: number): number {
  return clamp(seconds, 0, RUN_SECONDS);
}

export function phaseAt(seconds: number): PhaseId {
  const time = runClock(seconds);
  return PHASE_IDS.find((id) => time < PHASE_RANGES[id].end) ?? 'rest';
}

export function catchFallAt(secondsIntoCatch: number): FallState {
  return cushionAt(CATCH, secondsIntoCatch);
}

export function landingFallAt(secondsIntoLanding: number): FallState {
  return cushionAt(LANDING, secondsIntoLanding);
}

function squatAt(elapsed: number): FallState {
  const settle = Math.exp(-SQUAT_RATE * elapsed);
  return {
    height: -TOUCHDOWN_SPEED_MS * elapsed * settle,
    verticalSpeed: -TOUCHDOWN_SPEED_MS * settle * (1 - SQUAT_RATE * elapsed),
  };
}

const ON_RAMP: ReadonlySet<PhaseId> = new Set(['ramp', 'brake', 'hold', 'deck']);
const AIRBORNE: ReadonlySet<PhaseId> = new Set(['flip', 'catch', 'leap', 'twist', 'landing']);
const GROUNDED: ReadonlySet<PhaseId> = new Set(['sprint', 'settle', 'runUp', 'rest']);

function reading(
  x: number,
  fall: FallState,
  groundSpeed: number,
  roll: number,
  pitch: number,
  phase: PhaseId,
): CarReading {
  return {
    position: [x, fall.height, 0],
    speed: Math.hypot(groundSpeed, fall.verticalSpeed),
    height: Math.max(0, fall.height),
    roll,
    pitch,
    onGround: GROUNDED.has(phase),
    onRamp: ON_RAMP.has(phase),
    airborne: AIRBORNE.has(phase),
  };
}

const LEVEL: FallState = { height: 0, verticalSpeed: 0 };

function sprintAt(time: number): CarReading {
  return reading(0.5 * SPRINT_ACCEL * time ** 2, LEVEL, SPRINT_ACCEL * time, 0, 0, 'sprint');
}

function settleAt(time: number): CarReading {
  const elapsed = time - SPRINT_SECONDS;
  const x = SPRINT_DISTANCE_M + SIXTY_MPH_MS * elapsed - 0.5 * SETTLE_DECEL * elapsed ** 2;
  return reading(x, LEVEL, SIXTY_MPH_MS - SETTLE_DECEL * elapsed, 0, 0, 'settle');
}

function rampAt(time: number): CarReading {
  const distance = RAMP.radius * loopAngleAt(LOOP_TIMES, time - RAMP_START);
  const [x, y] = rampPoint(distance);
  const pitch = rampPitch(distance);
  const speed = loopSpeedAt(ENTRY_SPEED_MS, RAMP.radius, pitch);
  const fall = { height: y, verticalSpeed: speed * Math.sin(pitch) };
  return reading(x, fall, speed * Math.cos(pitch), 0, pitch, 'ramp');
}

const ON_DECK: FallState = { height: DECK_HEIGHT, verticalSpeed: 0 };

function brakeAt(time: number): CarReading {
  const elapsed = time - BRAKE_START;
  const travelled = TOP_SPEED_MS * elapsed - 0.5 * DECK_BRAKE_DECEL * elapsed ** 2;
  const speed = TOP_SPEED_MS - DECK_BRAKE_DECEL * elapsed;
  return reading(RAMP.entryX - travelled, ON_DECK, speed, 0, Math.PI, 'brake');
}

function holdAt(): CarReading {
  return reading(DECK_STOP_X, ON_DECK, 0, 0, Math.PI, 'hold');
}

function deckAt(time: number): CarReading {
  const elapsed = time - DECK_START;
  const x = DECK_STOP_X - 0.5 * DECK_ACCEL * elapsed ** 2;
  return reading(x, ON_DECK, DECK_ACCEL * elapsed, 0, Math.PI, 'deck');
}

function hookX(time: number): number {
  return DECK_END_X - LAUNCH_SPEED * (time - FLIP_START);
}

function flipAt(time: number): CarReading {
  const fall = freeFall(DECK_HEIGHT, 0, time - FLIP_START);
  const roll = rollAngleAt(time - ROLL_START, ROLL_INERTIA_KG_M2, ROLL_NOZZLE_N);
  return reading(hookX(time), fall, LAUNCH_SPEED, roll, Math.PI, 'flip');
}

function catchAt(time: number): CarReading {
  const fall = catchFallAt(time - CATCH_START);
  return reading(hookX(time), fall, LAUNCH_SPEED, Math.PI, Math.PI, 'catch');
}

function runUpAt(time: number): CarReading {
  const elapsed = time - TOUCHDOWN;
  const burn = Math.min(elapsed, RUN_UP_BURN_SECONDS);
  const cruise = elapsed - burn;
  const distance = LAUNCH_SPEED * burn + 0.5 * RUN_UP_ACCEL * burn ** 2 + RUN_UP_SPEED_MS * cruise;
  const groundSpeed = LAUNCH_SPEED + RUN_UP_ACCEL * burn;
  return reading(TOUCHDOWN_X - distance, squatAt(elapsed), groundSpeed, Math.PI, Math.PI, 'runUp');
}

function jumpX(time: number): number {
  return JUMP.leapX - RUN_UP_SPEED_MS * (time - LIFT_OFF);
}

function leapAt(time: number): CarReading {
  const elapsed = time - LIFT_OFF;
  const fall = { height: 0.5 * LEAP_ACCEL * elapsed ** 2, verticalSpeed: LEAP_ACCEL * elapsed };
  return reading(jumpX(time), fall, RUN_UP_SPEED_MS, Math.PI, Math.PI, 'leap');
}

function twistAt(time: number): CarReading {
  const elapsed = time - TWIST_START;
  const fall = freeFall(LEAP_TOP, LEAP_UP_SPEED, elapsed);
  const twist = rollAngleAt(elapsed, ROLL_INERTIA_KG_M2, ROLL_NOZZLE_N, FULL_TURN);
  return reading(jumpX(time), fall, RUN_UP_SPEED_MS, Math.PI + twist, Math.PI, 'twist');
}

function landingAt(time: number): CarReading {
  const fall = landingFallAt(time - LANDING_START);
  return reading(jumpX(time), fall, RUN_UP_SPEED_MS, Math.PI + FULL_TURN, Math.PI, 'landing');
}

function restAt(time: number): CarReading {
  const elapsed = time - LANDED;
  const groundSpeed = Math.max(0, RUN_UP_SPEED_MS - BRAKE_DECEL * elapsed);
  const x = LANDED_X - (RUN_UP_SPEED_MS ** 2 - groundSpeed ** 2) / (2 * BRAKE_DECEL);
  return reading(x, squatAt(elapsed), groundSpeed, Math.PI + FULL_TURN, Math.PI, 'rest');
}

const PHASE_MOTION: Readonly<Record<PhaseId, (time: number) => CarReading>> = {
  sprint: sprintAt,
  settle: settleAt,
  ramp: rampAt,
  brake: brakeAt,
  hold: holdAt,
  deck: deckAt,
  flip: flipAt,
  catch: catchAt,
  runUp: runUpAt,
  leap: leapAt,
  twist: twistAt,
  landing: landingAt,
  rest: restAt,
};

export function carAt(seconds: number): CarReading {
  const time = runClock(seconds);
  return PHASE_MOTION[phaseAt(time)](time);
}

function silentNozzles(): Record<NozzleId, number> {
  return Object.fromEntries(NOZZLE_IDS.map((id) => [id, 0])) as Record<NozzleId, number>;
}

export function nozzlesAt(seconds: number): NozzleThrusts {
  const time = runClock(seconds);
  const thrusts = silentNozzles();
  BURNS.filter((burn) => time >= burn.start && time < burn.end).forEach((burn) =>
    burn.nozzles.forEach((id) => (thrusts[id] = burn.thrustEach)),
  );
  return thrusts;
}

export function fansAt(seconds: number): boolean {
  return ON_RAMP.has(phaseAt(seconds));
}

export function runAt(seconds: number): RunReading {
  return {
    phase: phaseAt(seconds),
    car: carAt(seconds),
    nozzles: nozzlesAt(seconds),
    fans: fansAt(seconds),
  };
}
