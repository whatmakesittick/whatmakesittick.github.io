import { smoothstep } from '@core/math';
import { START_STEP_IDS } from '../ids';
import type { EngineStateId, StartStepId } from '../ids';
import { PRIMER_PRESSES } from './constants';
import { CYCLE_DEG, SPARK_DEG } from './cycle';
import { STARTER_GEOMETRY } from './scale';

export const START_STEP_SECONDS: Readonly<Record<StartStepId, number>> = {
  brake: 0.6,
  choke: 0.6,
  decompression: 0.5,
  primer: 1.2,
  firstPull: 2.6,
  pop: 1,
  chokeOff: 0.6,
  secondPull: 1.8,
  fastIdle: 1.5,
  idle: 1,
};

export const START_SHOW_SECONDS = START_STEP_IDS.reduce(
  (sum, id) => sum + START_STEP_SECONDS[id],
  0,
);

export const TAKE_UP_SECONDS = 0.6;
export const REWIND_SECONDS = 0.8;
export const TAKE_UP_ROPE_M = 0.01;
export const PULL_CRANK_DEG_PER_S = 360;
export const POP_COAST_DEG = 270;
export const DECOMPRESSION_PUSH_SHARE = 0.5;

const PULLEY_CIRCUMFERENCE_M = 2 * Math.PI * STARTER_GEOMETRY.pulley.radius;

function ropeForCrank(degrees: number): number {
  return (degrees / CYCLE_DEG) * PULLEY_CIRCUMFERENCE_M;
}

export function pulleyDegrees(ropeMetres: number): number {
  return (ropeMetres / PULLEY_CIRCUMFERENCE_M) * CYCLE_DEG;
}

const TAKE_UP_CRANK_DEG = pulleyDegrees(TAKE_UP_ROPE_M);
const FIRST_FAST_SECONDS = START_STEP_SECONDS.firstPull - TAKE_UP_SECONDS;
const SECOND_FAST_SECONDS = START_STEP_SECONDS.secondPull - TAKE_UP_SECONDS;
const FIRST_PULL_ROPE_M = TAKE_UP_ROPE_M + ropeForCrank(PULL_CRANK_DEG_PER_S * FIRST_FAST_SECONDS);
const SECOND_PULL_ROPE_M =
  TAKE_UP_ROPE_M + ropeForCrank(PULL_CRANK_DEG_PER_S * SECOND_FAST_SECONDS);

export const PULL_ROPE_SHARE = FIRST_PULL_ROPE_M / STARTER_GEOMETRY.ropeDrawM;

export interface StartPose {
  step: StartStepId;
  engine: EngineStateId;
  guardForward: number;
  chokeLever: number;
  decompressionIn: boolean;
  primerSqueeze: number;
  ropeOut: number;
  pulleyDeg: number;
  pawlsEngaged: boolean;
  crankDeg: number;
  ignition: boolean;
  burn: boolean;
}

export const READY_POSE: Readonly<StartPose> = {
  step: 'brake',
  engine: 'stopped',
  guardForward: 0,
  chokeLever: 0,
  decompressionIn: false,
  primerSqueeze: 0,
  ropeOut: 0,
  pulleyDeg: 0,
  pawlsEngaged: false,
  crankDeg: 0,
  ignition: false,
  burn: false,
};

const STEP_STARTS: Readonly<Record<StartStepId, number>> = Object.fromEntries(
  START_STEP_IDS.map((id, index) => [
    id,
    START_STEP_IDS.slice(0, index).reduce((sum, earlier) => sum + START_STEP_SECONDS[earlier], 0),
  ]),
) as Record<StartStepId, number>;

export function startStepAt(seconds: number): StartStepId {
  const after = START_STEP_IDS.filter((id) => seconds >= STEP_STARTS[id]);
  return after[after.length - 1] ?? START_STEP_IDS[0];
}

function stepOrder(step: StartStepId): number {
  return START_STEP_IDS.indexOf(step);
}

function reached(step: StartStepId, current: StartStepId): boolean {
  return stepOrder(current) >= stepOrder(step);
}

interface Pull {
  rope: number;
  crank: number;
  gripping: boolean;
}

function pullAt(local: number, fastSeconds: number): Pull {
  if (local < TAKE_UP_SECONDS) {
    const rope = TAKE_UP_ROPE_M * smoothstep(local, 0, TAKE_UP_SECONDS);
    return { rope, crank: pulleyDegrees(rope), gripping: true };
  }
  const fast = Math.min(local - TAKE_UP_SECONDS, fastSeconds);
  const crank = TAKE_UP_CRANK_DEG + PULL_CRANK_DEG_PER_S * fast;
  return { rope: TAKE_UP_ROPE_M + ropeForCrank(crank - TAKE_UP_CRANK_DEG), crank, gripping: true };
}

function rewound(from: number, local: number): number {
  return from * (1 - smoothstep(local, 0, REWIND_SECONDS));
}

const FIRST_PULL_CRANK_DEG = TAKE_UP_CRANK_DEG + PULL_CRANK_DEG_PER_S * FIRST_FAST_SECONDS;
const AFTER_POP_CRANK_DEG = FIRST_PULL_CRANK_DEG + POP_COAST_DEG;
const SECOND_PULL_CRANK_DEG = TAKE_UP_CRANK_DEG + PULL_CRANK_DEG_PER_S * SECOND_FAST_SECONDS;
export const CATCH_CRANK_DEG = AFTER_POP_CRANK_DEG + SECOND_PULL_CRANK_DEG;

interface Motion {
  rope: number;
  crank: number;
  gripping: boolean;
}

function motionAt(step: StartStepId, local: number): Motion {
  switch (step) {
    case 'firstPull':
      return pullAt(local, FIRST_FAST_SECONDS);
    case 'pop':
      return {
        rope: rewound(FIRST_PULL_ROPE_M, local),
        crank: FIRST_PULL_CRANK_DEG + POP_COAST_DEG * smoothstep(local, 0, START_STEP_SECONDS.pop),
        gripping: false,
      };
    case 'chokeOff':
      return { rope: 0, crank: AFTER_POP_CRANK_DEG, gripping: false };
    case 'secondPull': {
      const pull = pullAt(local, SECOND_FAST_SECONDS);
      return { ...pull, crank: AFTER_POP_CRANK_DEG + pull.crank };
    }
    case 'fastIdle':
      return { rope: rewound(SECOND_PULL_ROPE_M, local), crank: CATCH_CRANK_DEG, gripping: false };
    case 'idle':
      return { rope: 0, crank: CATCH_CRANK_DEG, gripping: false };
    default:
      return { rope: 0, crank: 0, gripping: false };
  }
}

const ENGINE_BY_STEP: Readonly<Record<StartStepId, EngineStateId>> = {
  brake: 'stopped',
  choke: 'stopped',
  decompression: 'stopped',
  primer: 'stopped',
  firstPull: 'cranking',
  pop: 'cranking',
  chokeOff: 'stopped',
  secondPull: 'cranking',
  fastIdle: 'fastIdle',
  idle: 'running',
};

const BURNING: ReadonlySet<StartStepId> = new Set(['pop', 'fastIdle', 'idle']);

function chokeAt(step: StartStepId, local: number): number {
  if (step === 'choke') return smoothstep(local, 0, START_STEP_SECONDS.choke);
  if (step === 'chokeOff') return 1 - smoothstep(local, 0, START_STEP_SECONDS.chokeOff);
  return reached('choke', step) && !reached('chokeOff', step) ? 1 : 0;
}

function primerAt(step: StartStepId, local: number): number {
  if (step !== 'primer') return 0;
  const press = (local * PRIMER_PRESSES) / START_STEP_SECONDS.primer;
  return 1 - Math.abs(2 * (press - Math.floor(press)) - 1);
}

function decompressionAt(step: StartStepId, local: number): boolean {
  if (step === 'decompression')
    return local >= DECOMPRESSION_PUSH_SHARE * START_STEP_SECONDS.decompression;
  return reached('primer', step) && !reached('pop', step);
}

function ignitionAt(step: StartStepId, local: number): boolean {
  const pulling = step === 'firstPull' || step === 'secondPull';
  if (pulling) return local >= TAKE_UP_SECONDS;
  return ENGINE_BY_STEP[step] !== 'stopped';
}

export function startPose(seconds: number): StartPose {
  if (seconds < 0 || seconds >= START_SHOW_SECONDS) return READY_POSE;
  const step = startStepAt(seconds);
  const local = seconds - STEP_STARTS[step];
  const motion = motionAt(step, local);
  return {
    step,
    engine: ENGINE_BY_STEP[step],
    guardForward: step === 'brake' ? smoothstep(local, 0, START_STEP_SECONDS.brake) : 1,
    chokeLever: chokeAt(step, local),
    decompressionIn: decompressionAt(step, local),
    primerSqueeze: primerAt(step, local),
    ropeOut: motion.rope / STARTER_GEOMETRY.ropeDrawM,
    pulleyDeg: pulleyDegrees(motion.rope),
    pawlsEngaged: motion.gripping,
    crankDeg: motion.crank,
    ignition: ignitionAt(step, local),
    burn: BURNING.has(step),
  };
}

export function magnetAngle(crankAngle: number): number {
  return STARTER_GEOMETRY.coilAngleDeg + SPARK_DEG - crankAngle;
}
