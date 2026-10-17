import { clamp, smoothstep } from '@core/math';
import { CORNER_NOZZLE_IDS, NOZZLE_IDS, PHASE_IDS, REAR_NOZZLE_IDS } from '../ids';
import type { CarReading, MomentId, NozzleId, NozzleThrusts, PhaseId, Point } from '../ids';
import { launchSpeed } from './ballistic';
import { BOOST_SECONDS, RAMP_ENTRY_SPEED_MS, RUN_BOOST_N } from './boost';
import {
  BRAKE_DECEL,
  CAR_MASS_KG,
  G,
  LANDING_SQUAT_M,
  ROLL_INERTIA_KG_M2,
  ROLL_NOZZLE_N,
} from './constants';
import { RAMP, RAMP_EXIT_X, rampHeight, rampPitch, rampRoll, rampSlope } from './layout';
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

export const RUN_SECONDS = 14;
export const RAMP_SECONDS = 0.9;
export const LAUNCH_HOLD_SECONDS = 0.3;
export const FLIP_SECONDS = 1.45;
export const CATCH_SECONDS = 0.85;

const RAMP_START = BOOST_SECONDS;
const LAUNCH_START = RAMP_START + RAMP_SECONDS;
const FLIP_START = LAUNCH_START + LAUNCH_HOLD_SECONDS;
const CATCH_START = FLIP_START + FLIP_SECONDS;
const TOUCHDOWN = CATCH_START + CATCH_SECONDS;

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  boost: { start: 0, end: RAMP_START },
  ramp: { start: RAMP_START, end: LAUNCH_START },
  launch: { start: LAUNCH_START, end: FLIP_START },
  flip: { start: FLIP_START, end: CATCH_START },
  catch: { start: CATCH_START, end: TOUCHDOWN },
  rest: { start: TOUCHDOWN, end: RUN_SECONDS },
};

const BOOST_ACCEL = RAMP_ENTRY_SPEED_MS / BOOST_SECONDS;
export const EXIT_SPEED_MS = launchSpeed(RAMP_ENTRY_SPEED_MS, RAMP.exitHeight);
const EXIT_ANGLE = rampPitch(1);
const LAUNCH_VX = EXIT_SPEED_MS * Math.cos(EXIT_ANGLE);
const LAUNCH_VY = EXIT_SPEED_MS * Math.sin(EXIT_ANGLE);
const ROLL_BURN_SECONDS = rollSeconds(ROLL_INERTIA_KG_M2, ROLL_NOZZLE_N) / 2;

const RAMP_ENTRY_RATE = (RAMP_ENTRY_SPEED_MS * RAMP_SECONDS) / RAMP.lengthX;
const RAMP_EXIT_RATE =
  (EXIT_SPEED_MS * RAMP_SECONDS) / (RAMP.lengthX * Math.hypot(1, rampSlope(1)));

function flightAt(secondsAfterExit: number): FallState {
  return {
    height: RAMP.exitHeight + LAUNCH_VY * secondsAfterExit - 0.5 * G * secondsAfterExit ** 2,
    verticalSpeed: LAUNCH_VY - G * secondsAfterExit,
  };
}

const CATCH_FROM = flightAt(CATCH_START - LAUNCH_START);
const CATCH_ACCEL =
  (-2 * (CATCH_FROM.height + CATCH_FROM.verticalSpeed * CATCH_SECONDS)) / CATCH_SECONDS ** 2;
export const CATCH_THRUST_N = CAR_MASS_KG * (G + CATCH_ACCEL);
export const TOUCHDOWN_SPEED_MS = -(CATCH_FROM.verticalSpeed + CATCH_ACCEL * CATCH_SECONDS);
const TOUCHDOWN_X = RAMP_EXIT_X + LAUNCH_VX * (TOUCHDOWN - LAUNCH_START);
const SQUAT_RATE = TOUCHDOWN_SPEED_MS / (LANDING_SQUAT_M * Math.E);

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  leavesRamp: LAUNCH_START,
  peak: LAUNCH_START + LAUNCH_VY / G,
  rollComplete: CATCH_START,
  touchdown: TOUCHDOWN,
  stopped: TOUCHDOWN + LAUNCH_VX / BRAKE_DECEL,
};

const LEFT_CORNERS: readonly NozzleId[] = ['cornerFrontLeft', 'cornerRearLeft'];
const RIGHT_CORNERS: readonly NozzleId[] = ['cornerFrontRight', 'cornerRearRight'];

export const BURNS: readonly Burn[] = [
  { start: 0, end: BOOST_SECONDS, nozzles: REAR_NOZZLE_IDS, thrustEach: RUN_BOOST_N / 4 },
  {
    start: FLIP_START,
    end: FLIP_START + ROLL_BURN_SECONDS,
    nozzles: LEFT_CORNERS,
    thrustEach: ROLL_NOZZLE_N,
  },
  {
    start: FLIP_START + ROLL_BURN_SECONDS,
    end: FLIP_START + 2 * ROLL_BURN_SECONDS,
    nozzles: RIGHT_CORNERS,
    thrustEach: ROLL_NOZZLE_N,
  },
  {
    start: CATCH_START,
    end: TOUCHDOWN,
    nozzles: CORNER_NOZZLE_IDS,
    thrustEach: CATCH_THRUST_N / CORNER_NOZZLE_IDS.length,
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

function rampProgress(share: number): number {
  const square = share ** 2;
  const cube = share ** 3;
  return (
    RAMP_ENTRY_RATE * (cube - 2 * square + share) +
    (3 * square - 2 * cube) +
    RAMP_EXIT_RATE * (cube - square)
  );
}

interface Motion {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function reading(motion: Motion, roll: number, pitch: number, phase: PhaseId): CarReading {
  const position: Point = [motion.x, motion.y, 0];
  return {
    position,
    speed: Math.hypot(motion.vx, motion.vy),
    height: Math.max(0, motion.y),
    roll,
    pitch,
    onGround: phase === 'boost' || phase === 'rest',
    onRamp: phase === 'ramp',
    airborne: phase === 'launch' || phase === 'flip' || phase === 'catch',
  };
}

function boostAt(time: number): CarReading {
  const motion = { x: 0.5 * BOOST_ACCEL * time ** 2, y: 0, vx: BOOST_ACCEL * time, vy: 0 };
  return reading(motion, 0, 0, 'boost');
}

function rampAt(time: number): CarReading {
  const u = rampProgress((time - RAMP_START) / RAMP_SECONDS);
  const height = rampHeight(u);
  const speed = launchSpeed(RAMP_ENTRY_SPEED_MS, height);
  const pitch = rampPitch(u);
  const motion = {
    x: RAMP.entryX + RAMP.lengthX * u,
    y: height,
    vx: speed * Math.cos(pitch),
    vy: speed * Math.sin(pitch),
  };
  return reading(motion, rampRoll(u), pitch, 'ramp');
}

function flightReading(time: number, phase: PhaseId): CarReading {
  const elapsed = time - LAUNCH_START;
  const fall = flightAt(elapsed);
  const motion = {
    x: RAMP_EXIT_X + LAUNCH_VX * elapsed,
    y: fall.height,
    vx: LAUNCH_VX,
    vy: fall.verticalSpeed,
  };
  const roll = Math.PI + rollAngleAt(time - FLIP_START, ROLL_INERTIA_KG_M2, ROLL_NOZZLE_N);
  const pitch = EXIT_ANGLE * (1 - smoothstep(time, FLIP_START, CATCH_START));
  return reading(motion, roll, pitch, phase);
}

export function catchFallAt(secondsIntoCatch: number): FallState {
  const elapsed = clamp(secondsIntoCatch, 0, CATCH_SECONDS);
  return {
    height:
      CATCH_FROM.height + CATCH_FROM.verticalSpeed * elapsed + 0.5 * CATCH_ACCEL * elapsed ** 2,
    verticalSpeed: CATCH_FROM.verticalSpeed + CATCH_ACCEL * elapsed,
  };
}

function catchAt(time: number): CarReading {
  const fall = catchFallAt(time - CATCH_START);
  const motion = {
    x: RAMP_EXIT_X + LAUNCH_VX * (time - LAUNCH_START),
    y: fall.height,
    vx: LAUNCH_VX,
    vy: fall.verticalSpeed,
  };
  return reading(motion, 2 * Math.PI, 0, 'catch');
}

function restAt(time: number): CarReading {
  const elapsed = time - TOUCHDOWN;
  const groundSpeed = Math.max(0, LAUNCH_VX - BRAKE_DECEL * elapsed);
  const settle = Math.exp(-SQUAT_RATE * elapsed);
  const motion = {
    x: TOUCHDOWN_X + (LAUNCH_VX ** 2 - groundSpeed ** 2) / (2 * BRAKE_DECEL),
    y: -TOUCHDOWN_SPEED_MS * elapsed * settle,
    vx: groundSpeed,
    vy: -TOUCHDOWN_SPEED_MS * settle * (1 - SQUAT_RATE * elapsed),
  };
  return reading(motion, 2 * Math.PI, 0, 'rest');
}

export function carAt(seconds: number): CarReading {
  const time = runClock(seconds);
  const phase = phaseAt(time);
  if (phase === 'boost') return boostAt(time);
  if (phase === 'ramp') return rampAt(time);
  if (phase === 'launch' || phase === 'flip') return flightReading(time, phase);
  if (phase === 'catch') return catchAt(time);
  return restAt(time);
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
  return phaseAt(seconds) === 'ramp';
}

export function runAt(seconds: number): RunReading {
  return {
    phase: phaseAt(seconds),
    car: carAt(seconds),
    nozzles: nozzlesAt(seconds),
    fans: fansAt(seconds),
  };
}
