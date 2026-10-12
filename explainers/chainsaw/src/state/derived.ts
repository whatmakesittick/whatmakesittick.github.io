import type { AssemblyState, ClutchStateId, SettingId } from '../ids';
import { PRESET_SETTINGS } from '../ids';
import {
  HALF_TURN_DEG,
  chainSpeedMs,
  clutchOf,
  crankcasePressure,
  drumDegrees,
  flowsAt,
  kickbackPose,
  oiling,
  phaseOf,
  portsAt,
  rate,
  rpmOf,
  rpmScale,
  shoesOut,
  sparkGlow,
  wrapDegrees,
} from '../model';
import type { ChainsawState } from './store';

export type LiveSource = Pick<ChainsawState, 'throttle' | 'brake'>;

export type AssemblySource = LiveSource &
  Pick<
    ChainsawState,
    'phase' | 'playing' | 'speed' | 'preset' | 'kickback' | 'kickbackSeconds' | 'chainMm' | 'view'
  >;

export type CrankcaseTrend = 'drawing' | 'squeezing';

export interface LiveReading {
  rpm: number;
  clutch: ClutchStateId;
  chainSpeed: number;
  oiling: boolean;
}

const NOT_KICKING = -1;

function readingOf({ throttle, brake }: LiveSource): LiveReading {
  const rpm = rpmOf(throttle);
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
    lastSource.brake === source.brake
  ) {
    return lastReading;
  }
  lastSource = { throttle: source.throttle, brake: source.brake };
  lastReading = readingOf(source);
  return lastReading;
}

export function crankcaseTrend(angle: number): CrankcaseTrend {
  return wrapDegrees(angle) < HALF_TURN_DEG ? 'squeezing' : 'drawing';
}

export function settingOf(source: Pick<ChainsawState, 'preset'>): SettingId {
  return PRESET_SETTINGS[source.preset];
}

function writeCrank(target: AssemblyState, source: AssemblySource, reading: LiveReading): void {
  const { crank } = target;
  const angle = source.phase;
  crank.angle = angle;
  crank.phase = phaseOf(angle);
  crank.rpm = reading.rpm;
  crank.degPerSecond = source.playing ? rate(source.speed) * rpmScale(reading.rpm) : 0;
  crank.sparkGlow = sparkGlow(angle);
  Object.assign(crank.ports, portsAt(angle));
  Object.assign(crank.flows, flowsAt(angle));
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

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const reading = liveReading(source);
  target.setting = settingOf(source);
  target.phase = source.phase;
  target.playing = source.playing;
  writeCrank(target, source, reading);
  writeDrive(target, source, reading);
  writeSafety(target, source);
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
    view: { ...source.view },
  };
  return writeAssemblyState(target, source);
}
