import { clamp, toDegrees, toRadians } from '@core/math';
import type { MomentId, PhaseId, WheelId } from '../ids';
import { PHASE_IDS } from '../ids';
import {
  ADVANCE_PER_BEAT_DEG,
  LIFT_ANGLE_DEG,
  MOMENT_PROGRESS,
  TOTAL_FORK_ANGLE_DEG,
  escapeAdvanceInBeat,
} from './escapement';
import { MAINSPRING } from './layout';
import {
  ARBOR_TURNS_FULL_WIND,
  MAINSPRING_BLADE,
  MOTION_WORKS,
  OSCILLATION_PERIOD_S,
  POWER_RESERVE_HOURS,
  TRAIN,
  WINDING,
  motionWorksRatio,
} from './train';

export const CYCLE_DEG = 360;
export const HALF_CYCLE_DEG = 180;
export const TICK_CENTRE_DEG = 90;
export const TOCK_CENTRE_DEG = 270;
export const BEATS_PER_CYCLE = 2;
export const ADVANCE_PER_CYCLE_DEG = ADVANCE_PER_BEAT_DEG * BEATS_PER_CYCLE;
export const START_TIME_ON_DIAL_S = 10 * 3600 + 9 * 60 + 30;
export const DEFAULT_AMPLITUDE_DEG = 280;
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_HALF_DAY = 43_200;
export const SECONDS_PER_DAY = 86_400;

export interface PhaseRange {
  readonly start: number;
  readonly end: number;
}

export function balanceAngle(phase: number, amplitude: number): number {
  return amplitude * Math.cos(toRadians(phase));
}

export function contactHalfWidth(amplitude: number): number {
  const share = clamp(LIFT_ANGLE_DEG / 2 / amplitude, 0, 1);
  return toDegrees(Math.asin(share));
}

export function phaseRanges(amplitude: number): Readonly<Record<PhaseId, PhaseRange>> {
  const w = contactHalfWidth(amplitude);
  return {
    swingIn: { start: 0, end: TICK_CENTRE_DEG - w },
    tick: { start: TICK_CENTRE_DEG - w, end: TICK_CENTRE_DEG + w },
    swingOut: { start: TICK_CENTRE_DEG + w, end: HALF_CYCLE_DEG },
    swingBack: { start: HALF_CYCLE_DEG, end: TOCK_CENTRE_DEG - w },
    tock: { start: TOCK_CENTRE_DEG - w, end: TOCK_CENTRE_DEG + w },
    swingHome: { start: TOCK_CENTRE_DEG + w, end: CYCLE_DEG },
  };
}

export function phaseAt(phase: number, amplitude: number): PhaseId {
  const ranges = phaseRanges(amplitude);
  const wrapped = ((phase % CYCLE_DEG) + CYCLE_DEG) % CYCLE_DEG;
  return PHASE_IDS.find((id) => wrapped < ranges[id].end) ?? 'swingHome';
}

export function isInContact(phase: number, amplitude: number): boolean {
  const id = phaseAt(phase, amplitude);
  return id === 'tick' || id === 'tock';
}

export function forkProgress(theta: number): number {
  return clamp((LIFT_ANGLE_DEG / 2 - theta) / LIFT_ANGLE_DEG, 0, 1);
}

export function forkAngle(theta: number): number {
  return TOTAL_FORK_ANGLE_DEG * (0.5 - forkProgress(theta));
}

export function isTockSide(phase: number): boolean {
  return ((phase % CYCLE_DEG) + CYCLE_DEG) % CYCLE_DEG >= HALF_CYCLE_DEG;
}

export function beatProgress(phase: number, amplitude: number): number {
  const progress = forkProgress(balanceAngle(phase, amplitude));
  return isTockSide(phase) ? 1 - progress : progress;
}

export function escapeWheelAngle(phase: number, cycles: number, amplitude: number): number {
  const beatsDone = isTockSide(phase) ? 1 : 0;
  const within = escapeAdvanceInBeat(beatProgress(phase, amplitude));
  return -(cycles * ADVANCE_PER_CYCLE_DEG + beatsDone * ADVANCE_PER_BEAT_DEG + within);
}

export function trainAngles(escapeAngle: number): Readonly<Record<WheelId, number>> {
  const angles: Partial<Record<WheelId, number>> = { escapeWheel: escapeAngle };
  for (let i = TRAIN.length - 1; i > 0; i -= 1) {
    const driven = TRAIN[i];
    const driver = TRAIN[i - 1];
    angles[driver.id] = -(angles[driven.id] ?? 0) * (driven.pinionLeaves / driver.teeth);
  }
  return angles as Record<WheelId, number>;
}

export function wheelAngles(
  phase: number,
  cycles: number,
  amplitude: number,
): Readonly<Record<WheelId, number>> {
  return trainAngles(escapeWheelAngle(phase, cycles, amplitude));
}

export function elapsedSeconds(phase: number, cycles: number): number {
  return (cycles + phase / CYCLE_DEG) * OSCILLATION_PERIOD_S;
}

export function timeOnDialSeconds(phase: number, cycles: number): number {
  const total = START_TIME_ON_DIAL_S + elapsedSeconds(phase, cycles);
  return ((total % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
}

export interface HandAngles {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface MotionWorksAngles extends HandAngles {
  readonly cannonPinion: number;
  readonly minuteWheel: number;
  readonly hourWheel: number;
}

function turnShare(seconds: number, period: number): number {
  return ((seconds % period) / period) * CYCLE_DEG;
}

export function motionWorksAngles(
  phase: number,
  cycles: number,
  amplitude: number = DEFAULT_AMPLITUDE_DEG,
): MotionWorksAngles {
  const wheels = wheelAngles(phase, cycles, amplitude);
  const minute = turnShare(START_TIME_ON_DIAL_S, SECONDS_PER_HOUR) + wheels.centreWheel;
  const hour =
    turnShare(START_TIME_ON_DIAL_S, SECONDS_PER_HALF_DAY) + wheels.centreWheel / motionWorksRatio();
  const second = turnShare(START_TIME_ON_DIAL_S, SECONDS_PER_MINUTE) + wheels.fourthWheel;
  const { cannonPinion, minuteWheel } = MOTION_WORKS;
  return {
    hour,
    minute,
    second,
    cannonPinion: minute,
    minuteWheel: -minute * (cannonPinion.leaves / minuteWheel.teeth),
    hourWheel: hour,
  };
}

export interface WindingAngles {
  readonly arbor: number;
  readonly ratchetWheel: number;
  readonly crownWheel: number;
  readonly stem: number;
}

export function arborTurns(reserveHours: number): number {
  return ARBOR_TURNS_FULL_WIND * clamp(reserveHours / POWER_RESERVE_HOURS, 0, 1);
}

export function windingAngles(reserveHours: number): WindingAngles {
  const arbor = arborTurns(reserveHours) * CYCLE_DEG;
  const crownWheel = -arbor * (WINDING.ratchetTeeth / WINDING.crownWheelTeeth);
  const stem = -crownWheel * (WINDING.crownWheelTeeth / WINDING.windingPinionLeaves);
  return { arbor, ratchetWheel: arbor, crownWheel, stem };
}

export interface CoilExtent {
  readonly innerRadiusMm: number;
  readonly outerRadiusMm: number;
  readonly coils: number;
}

export function springSectionAreaMm2(): number {
  return MAINSPRING_BLADE.lengthMm * MAINSPRING_BLADE.thicknessMm;
}

export function runDownInnerRadiusMm(): number {
  const { wallRadiusMm } = MAINSPRING;
  return Math.sqrt(wallRadiusMm * wallRadiusMm - springSectionAreaMm2() / Math.PI);
}

function coilsFromInnerRadius(innerRadiusMm: number): number {
  const area = springSectionAreaMm2() / Math.PI;
  const outer = Math.sqrt(innerRadiusMm * innerRadiusMm + area);
  return (outer - innerRadiusMm) / MAINSPRING_BLADE.thicknessMm;
}

function innerRadiusFromCoils(coils: number): number {
  const area = springSectionAreaMm2() / Math.PI;
  const packed = coils * MAINSPRING_BLADE.thicknessMm;
  return (area - packed * packed) / (2 * packed);
}

export function fullWindInnerRadiusMm(): number {
  const runDownCoils = coilsFromInnerRadius(runDownInnerRadiusMm());
  return Math.max(
    MAINSPRING.arborRadiusMm,
    innerRadiusFromCoils(runDownCoils + ARBOR_TURNS_FULL_WIND),
  );
}

export function mainspringCoil(reserveHours: number): CoilExtent {
  const wound = clamp(reserveHours / POWER_RESERVE_HOURS, 0, 1);
  const runDown = runDownInnerRadiusMm();
  const innerRadiusMm = runDown - wound * (runDown - fullWindInnerRadiusMm());
  const outerRadiusMm = Math.sqrt(innerRadiusMm * innerRadiusMm + springSectionAreaMm2() / Math.PI);
  return { innerRadiusMm, outerRadiusMm, coils: coilsFromInnerRadius(innerRadiusMm) };
}

export function cycleCountAfter(previousPhase: number, nextPhase: number, cycles: number): number {
  if (nextPhase < previousPhase - HALF_CYCLE_DEG) return cycles + 1;
  if (nextPhase > previousPhase + HALF_CYCLE_DEG) return cycles - 1;
  return cycles;
}

export function momentPhase(id: MomentId, amplitude: number): number {
  const theta = LIFT_ANGLE_DEG / 2 - MOMENT_PROGRESS[id] * LIFT_ANGLE_DEG;
  return toDegrees(Math.acos(clamp(theta / amplitude, -1, 1)));
}

export function tickContactMs(phase: number, amplitude: number): number {
  const ranges = phaseRanges(amplitude);
  const range = isTockSide(phase) ? ranges.tock : ranges.tick;
  const since = clamp(phase - range.start, 0, range.end - range.start);
  return (since / CYCLE_DEG) * OSCILLATION_PERIOD_S * 1000;
}
