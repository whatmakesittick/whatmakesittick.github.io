import { FULL_TURN, lerp, smoothstep } from '@core/math';
import type {
  ArmId,
  ArmReading,
  BreathId,
  KickId,
  LegReading,
  PaceId,
  StrokeReading,
} from '../ids';
import { activeDragN, dragFactor } from './drag';
import { PACES, cycleSeconds, paceSpeed } from './paces';
import { phaseAt, phaseBounds } from './phases';
import { CYCLE_UNITS, wrapUnits } from './playback';

export const ELBOW_DEG = { catch: 148, underShoulder: 105, pushEnd: 151 } as const;

export const HAND_DEPTH_M = {
  entry: 0.06,
  glide: 0.2,
  catch: 0.28,
  pullEnd: 0.67,
  pushMean: 0.37,
  pushEnd: 0.05,
} as const;

export const HAND_SPEED_MS = { entryCatch: 2.33, pull: 2.52, push: 3.57, recovery: 6.25 } as const;

export const CATCH_FORCE_N = 22;
export const PEAK_FORCE_N = 100;
export const PUSH_OVER_PULL = 1.15;
export const PEAK_AT_UNDERWATER_SHARE = 0.7;
export const FORCE_SHAPE_POWER = 3;
export const SPRINT_STROKE_RATE = 60;
export const SHOULDER_PEAK_UNITS = 250;
export const HIP_LAG_UNITS = 50;
export const BREATH_EXTRA_DEG = 9;
export const BREATH_RAMP_SHARE = 0.25;
export const KICK_DEPTH_M = 0.35;
export const GLIDE_KEY_SHARE = 0.5;
export const PULL_KEY_SHARE = 0.6;
export const SWING_MS = 0.4;
export const SPLASH_UNITS = 120;
export const RELEASE_SHARE = 0.1;
export const LEFT_ARM_OFFSET_UNITS = CYCLE_UNITS / 2;

const PULL_END_FORCE_N = PEAK_FORCE_N / PUSH_OVER_PULL;
const PULL_END_SHAPE =
  ((PULL_END_FORCE_N - CATCH_FORCE_N) / (PEAK_FORCE_N - CATCH_FORCE_N)) ** (1 / FORCE_SHAPE_POWER);

function frac(value: number): number {
  return value - Math.floor(value);
}

function between(from: number, to: number, units: number, start: number, end: number): number {
  return lerp(from, to, smoothstep(units, start, end));
}

function elbowAt(units: number, pace: PaceId): number | null {
  const { entryCatch, pull, push } = phaseBounds(pace);
  if (units < entryCatch[1] || units > push[1]) return null;
  if (units < pull[1]) {
    return between(ELBOW_DEG.catch, ELBOW_DEG.underShoulder, units, pull[0], pull[1]);
  }
  return between(ELBOW_DEG.underShoulder, ELBOW_DEG.pushEnd, units, push[0], push[1]);
}

function handDepthAt(units: number, pace: PaceId): number | null {
  const { pull, push, recovery } = phaseBounds(pace);
  if (units >= recovery[0]) return null;
  const pullKey = lerp(pull[0], pull[1], PULL_KEY_SHARE);
  const pushMid = (push[0] + push[1]) / 2;
  const keys: readonly (readonly [number, number])[] = [
    [0, HAND_DEPTH_M.entry],
    [pull[0] * GLIDE_KEY_SHARE, HAND_DEPTH_M.glide],
    [pull[0], HAND_DEPTH_M.catch],
    [pullKey, PACES[pace].pullKeyDepthM],
    [pull[1], HAND_DEPTH_M.pullEnd],
    [pushMid, HAND_DEPTH_M.pushMean],
    [push[1], HAND_DEPTH_M.pushEnd],
  ];
  const next = keys.findIndex(([at]) => units <= at);
  const [fromAt, fromValue] = keys[Math.max(next - 1, 0)];
  const [toAt, toValue] = keys[Math.max(next, 1)];
  return between(fromValue, toValue, units, fromAt, toAt);
}

function handSpeedAt(units: number, pace: PaceId): number {
  const bounds = phaseBounds(pace);
  const ids = ['entryCatch', 'pull', 'push', 'recovery'] as const;
  const mids = ids.map((id) => (bounds[id][0] + bounds[id][1]) / 2);
  const index = mids.findIndex((mid) => units < mid);
  const toIndex = index === -1 ? 0 : index;
  const fromIndex = (toIndex + ids.length - 1) % ids.length;
  const fromAt = mids[fromIndex] - (fromIndex > toIndex ? CYCLE_UNITS : 0);
  const toAt = mids[toIndex] + (index === -1 ? CYCLE_UNITS : 0);
  const reading = between(
    HAND_SPEED_MS[ids[fromIndex]],
    HAND_SPEED_MS[ids[toIndex]],
    units,
    fromAt,
    toAt,
  );
  return reading * (PACES[pace].strokeRate / SPRINT_STROKE_RATE);
}

function forceShape(share: number, pullEndShare: number): number {
  if (share <= pullEndShare) {
    return PULL_END_SHAPE * smoothstep(share, 0, pullEndShare);
  }
  if (share <= PEAK_AT_UNDERWATER_SHARE) {
    return lerp(PULL_END_SHAPE, 1, smoothstep(share, pullEndShare, PEAK_AT_UNDERWATER_SHARE));
  }
  return 1 - smoothstep(share, PEAK_AT_UNDERWATER_SHARE, 1);
}

export function handForceAt(units: number, pace: PaceId): number {
  const { entryCatch, pull, push, recovery } = phaseBounds(pace);
  if (units < entryCatch[1]) return CATCH_FORCE_N * smoothstep(units, 0, entryCatch[1]);
  if (units < recovery[0]) {
    const share = (units - pull[0]) / (push[1] - pull[0]);
    const pullEndShare = (pull[1] - pull[0]) / (push[1] - pull[0]);
    const shaped = forceShape(share, pullEndShare) ** FORCE_SHAPE_POWER;
    return CATCH_FORCE_N + (PEAK_FORCE_N - CATCH_FORCE_N) * shaped;
  }
  const release = recovery[0] + (recovery[1] - recovery[0]) * RELEASE_SHARE;
  return CATCH_FORCE_N * (1 - smoothstep(units, recovery[0], release));
}

export function armAt(units: number, pace: PaceId): ArmReading {
  const wrapped = wrapUnits(units);
  const { phase, progress } = phaseAt(wrapped, pace);
  return {
    phase,
    progress,
    underwater: phase !== 'recovery',
    elbowDeg: elbowAt(wrapped, pace),
    handDepthM: handDepthAt(wrapped, pace),
    handSpeedMs: handSpeedAt(wrapped, pace),
    handForceN: handForceAt(wrapped, pace),
  };
}

export function breathWindow(units: number, pace: PaceId): number {
  const { phase, progress } = phaseAt(units, pace);
  if (phase !== 'recovery') return 0;
  return (
    smoothstep(progress, 0, BREATH_RAMP_SHARE) *
    (1 - smoothstep(progress, 1 - BREATH_RAMP_SHARE, 1))
  );
}

export function shoulderRollAt(units: number, pace: PaceId): number {
  const amplitude = PACES[pace].shoulderRollDeg;
  return amplitude * Math.cos((FULL_TURN * (units - SHOULDER_PEAK_UNITS)) / CYCLE_UNITS);
}

export function shoulderRollDegAt(units: number, pace: PaceId, breathing: BreathId): number {
  const wrapped = wrapUnits(units);
  const breath = breathing === 'right' ? breathWindow(wrapped, pace) : 0;
  return shoulderRollAt(wrapped, pace) - BREATH_EXTRA_DEG * breath;
}

export function hipRollAt(units: number, pace: PaceId): number {
  const amplitude = PACES[pace].hipRollDeg;
  const peak = SHOULDER_PEAK_UNITS + HIP_LAG_UNITS;
  return amplitude * Math.cos((FULL_TURN * (units - peak)) / CYCLE_UNITS);
}

function legAt(units: number, beats: number, offsetUnits: number): LegReading {
  return {
    beats,
    phase: frac((beats * (units - offsetUnits)) / CYCLE_UNITS),
    depthM: KICK_DEPTH_M,
  };
}

export const KICK_BEATS: Readonly<Record<KickId, number>> = { two: 1, six: 3 };

export function legsAt(units: number, kick: KickId): { left: LegReading; right: LegReading } {
  const beats = KICK_BEATS[kick];
  return {
    left: legAt(units, beats, 0),
    right: legAt(units, beats, LEFT_ARM_OFFSET_UNITS),
  };
}

function speedPeakUnits(pace: PaceId): number {
  const { push } = phaseBounds(pace);
  return (push[0] + push[1]) / 2;
}

function swingPhase(units: number, pace: PaceId): number {
  return (2 * FULL_TURN * (units - speedPeakUnits(pace))) / CYCLE_UNITS;
}

export function speedAt(units: number, pace: PaceId): number {
  return paceSpeed(pace) + 0.5 * SWING_MS * Math.cos(swingPhase(units, pace));
}

export function surgeAt(units: number, pace: PaceId): number {
  const amplitude = (0.5 * SWING_MS * cycleSeconds(pace)) / (2 * FULL_TURN);
  return amplitude * Math.sin(swingPhase(units, pace));
}

export function scrollAt(units: number, pace: PaceId): number {
  return (PACES[pace].strokeLengthM * units) / CYCLE_UNITS;
}

function splashAt(armUnits: number): number {
  return 1 - smoothstep(wrapUnits(armUnits), 0, SPLASH_UNITS);
}

export interface StrokeOptions {
  pace: PaceId;
  kick: KickId;
  breathing: BreathId;
  headUp: boolean;
}

export function strokeAt(units: number, options: StrokeOptions): StrokeReading {
  const { pace, kick, breathing, headUp } = options;
  const wrapped = wrapUnits(units);
  const leftUnits = wrapped - LEFT_ARM_OFFSET_UNITS;
  const right = armAt(wrapped, pace);
  const left = armAt(leftUnits, pace);
  const breath = breathing === 'right' ? breathWindow(wrapped, pace) : 0;
  const speedMs = speedAt(wrapped, pace);
  const pullingHand: ArmId = left.handForceN > right.handForceN ? 'left' : 'right';
  return {
    units: wrapped,
    pace,
    kick,
    breathing,
    right,
    left,
    shoulderRollDeg: shoulderRollDegAt(wrapped, pace, breathing),
    hipRollDeg: hipRollAt(wrapped, pace),
    headTurn: breath,
    breathExtraDeg: BREATH_EXTRA_DEG * breath,
    legs: legsAt(wrapped, kick),
    speedMs,
    surgeM: surgeAt(wrapped, pace),
    scrollM: scrollAt(units, pace),
    dragN: activeDragN(speedMs),
    dragFactor: dragFactor(headUp),
    entrySplash: { right: splashAt(wrapped), left: splashAt(leftUnits) },
    pullingHand,
  };
}
