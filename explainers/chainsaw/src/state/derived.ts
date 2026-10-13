import type {
  AssemblyState,
  ClutchStateId,
  EngineStateId,
  SettingId,
  StartDisplayId,
} from '../ids';
import { PRESET_SETTINGS } from '../ids';
import {
  HALF_TURN_DEG,
  PULL_CRANK_DEG_PER_S,
  READY_POSE,
  chainSpeedMs,
  clutchOf,
  crankcasePressure,
  drumDegrees,
  engineRpm,
  flowsAt,
  kickbackPose,
  oiling,
  phaseOf,
  portsAt,
  rate,
  rpmScale,
  shoesOut,
  sparkGlow,
  startPose,
  wrapDegrees,
} from '../model';
import type { StartPose } from '../model';
import type { ChainsawState } from './store';

export type LiveSource = Pick<ChainsawState, 'throttle' | 'brake' | 'engine'>;

export type AssemblySource = LiveSource &
  Pick<
    ChainsawState,
    | 'phase'
    | 'playing'
    | 'speed'
    | 'preset'
    | 'kickback'
    | 'kickbackSeconds'
    | 'chainMm'
    | 'view'
    | 'starting'
    | 'startSeconds'
  >;

export type StartSource = Pick<ChainsawState, 'engine' | 'starting' | 'startSeconds'>;

export type CrankcaseTrend = 'drawing' | 'squeezing';

export interface LiveReading {
  rpm: number;
  clutch: ClutchStateId;
  chainSpeed: number;
  oiling: boolean;
}

const NOT_KICKING = -1;

const FIRING: ReadonlySet<EngineStateId> = new Set<EngineStateId>(['fastIdle', 'running']);

function readingOf({ throttle, brake, engine }: LiveSource): LiveReading {
  const rpm = engineRpm(engine, throttle);
  const clutch = clutchOf(rpm, brake);
  return { rpm, clutch, chainSpeed: chainSpeedMs(rpm, clutch), oiling: oiling(clutch) };
}

let lastSource: LiveSource | null = null;
let lastReading: LiveReading | null = null;

export function liveReading(source: LiveSource): LiveReading {
  if (
    lastReading &&
    lastSource &&
    lastSource.throttle === source.throttle &&
    lastSource.brake === source.brake &&
    lastSource.engine === source.engine
  ) {
    return lastReading;
  }
  lastSource = { throttle: source.throttle, brake: source.brake, engine: source.engine };
  lastReading = readingOf(source);
  return lastReading;
}

export function crankcaseTrend(angle: number): CrankcaseTrend {
  return wrapDegrees(angle) < HALF_TURN_DEG ? 'squeezing' : 'drawing';
}

export function isFiring(engine: EngineStateId): boolean {
  return FIRING.has(engine);
}

export function startPoseOf(source: StartSource): Readonly<StartPose> {
  return source.starting ? startPose(source.startSeconds) : READY_POSE;
}

export function startDisplayOf(source: StartSource): StartDisplayId {
  if (source.starting) return startPoseOf(source).step;
  return source.engine === 'stopped' ? 'ready' : 'done';
}

function crankRate(source: AssemblySource, reading: LiveReading): number {
  if (source.starting && source.engine === 'cranking') return PULL_CRANK_DEG_PER_S;
  return source.playing ? rate(source.speed) * rpmScale(reading.rpm) : 0;
}

export function settingOf(source: Pick<ChainsawState, 'preset'>): SettingId {
  return PRESET_SETTINGS[source.preset];
}

function writeCrank(
  target: AssemblyState,
  source: AssemblySource,
  reading: LiveReading,
  pose: Readonly<StartPose>,
): void {
  const { crank } = target;
  const angle = source.phase;
  const firing = isFiring(source.engine);
  crank.angle = angle;
  crank.phase = phaseOf(angle);
  crank.rpm = reading.rpm;
  crank.degPerSecond = crankRate(source, reading);
  crank.sparkGlow = pose.ignition || firing ? sparkGlow(angle) : 0;
  Object.assign(crank.ports, portsAt(angle));
  Object.assign(crank.flows, flowsAt(angle));
  if (!pose.burn && !firing) crank.flows.burn = 0;
  crank.crankcasePressure = crankcasePressure(angle);
}

function writeDrive(target: AssemblyState, source: AssemblySource, reading: LiveReading): void {
  const { drive } = target;
  drive.throttle = source.throttle;
  drive.clutch = reading.clutch;
  drive.shoesOut = shoesOut(reading.rpm);
  drive.chainMm = source.chainMm;
  drive.drumDeg = drumDegrees(source.chainMm);
  drive.chainSpeed = reading.chainSpeed;
  drive.oiling = reading.oiling;
}

function writeSafety(target: AssemblyState, source: AssemblySource): void {
  const { safety } = target;
  const pose = kickbackPose(source.kickback ? source.kickbackSeconds : NOT_KICKING);
  safety.brake = source.brake;
  safety.kickback = source.kickback;
  safety.riseDeg = pose.riseDeg;
  safety.guardForward = source.brake ? 1 : pose.guardForward;
}

function writeStart(
  target: AssemblyState,
  source: AssemblySource,
  pose: Readonly<StartPose>,
): void {
  const { start } = target;
  start.starting = source.starting;
  start.step = pose.step;
  start.engine = source.engine;
  start.chokeLever = pose.chokeLever;
  start.decompressionIn = pose.decompressionIn;
  start.primerSqueeze = pose.primerSqueeze;
  start.ropeOut = pose.ropeOut;
  start.pulleyDeg = pose.pulleyDeg;
  start.pawlsEngaged = pose.pawlsEngaged;
}

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const reading = liveReading(source);
  const pose = startPoseOf(source);
  target.setting = settingOf(source);
  target.phase = source.phase;
  target.playing = source.playing;
  writeCrank(target, source, reading, pose);
  writeDrive(target, source, reading);
  writeSafety(target, source);
  writeStart(target, source, pose);
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const target: AssemblyState = {
    setting: settingOf(source),
    phase: source.phase,
    playing: source.playing,
    crank: {
      angle: 0,
      phase: 'power',
      rpm: 0,
      degPerSecond: 0,
      sparkGlow: 0,
      ports: { exhaust: 0, transfer: 0, intake: 0 },
      flows: { intake: 0, transfer: 0, exhaust: 0, burn: 0 },
      crankcasePressure: 0,
    },
    drive: {
      throttle: 0,
      clutch: 'open',
      shoesOut: 0,
      chainMm: 0,
      drumDeg: 0,
      chainSpeed: 0,
      oiling: false,
    },
    safety: { brake: false, kickback: false, riseDeg: 0, guardForward: 0 },
    start: {
      starting: false,
      step: 'brake',
      engine: 'running',
      chokeLever: 0,
      decompressionIn: false,
      primerSqueeze: 0,
      ropeOut: 0,
      pulleyDeg: 0,
      pawlsEngaged: false,
    },
    view: { ...source.view },
  };
  return writeAssemblyState(target, source);
}
