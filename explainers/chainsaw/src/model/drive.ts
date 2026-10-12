import { clamp, smoothstep } from '@core/math';
import type { ClutchStateId, ThrottleChoiceId } from '../ids';
import {
  CUTTERS,
  DRIVE_LINKS,
  ENGAGE_RPM,
  IDLE_RPM,
  MAX_POWER_RPM,
  PITCHES_PER_DRIVE_LINK,
  PITCH_MM,
  SPROCKET_TEETH,
} from './constants';
import { CYCLE_DEG } from './cycle';

const SECONDS_PER_MINUTE = 60;
const MM_PER_METRE = 1000;
const MS_PER_SECOND = 1000;
const KMH_PER_MS = 3.6;

export const DRIVE_LINK_MM = PITCHES_PER_DRIVE_LINK * PITCH_MM;
export const CHAIN_MM_PER_TURN = SPROCKET_TEETH * DRIVE_LINK_MM;
export const CHAIN_LOOP_MM = DRIVE_LINKS * DRIVE_LINK_MM;

export const THROTTLE_RANGE = { min: 0, max: 1, step: 0.01 } as const;

export const THROTTLE_PRESETS: Readonly<Record<ThrottleChoiceId, number>> = {
  idle: 0,
  half: 0.5,
  full: 1,
};

export function snapThrottle(throttle: number): number {
  const { min, max, step } = THROTTLE_RANGE;
  const steps = Math.round((clamp(throttle, min, max) - min) / step);
  return Number((min + steps * step).toFixed(2));
}

export function rpmOf(throttle: number): number {
  return IDLE_RPM + clamp(throttle, 0, 1) * (MAX_POWER_RPM - IDLE_RPM);
}

export function throttleOf(rpm: number): number {
  return clamp((rpm - IDLE_RPM) / (MAX_POWER_RPM - IDLE_RPM), 0, 1);
}

export function clutchOf(rpm: number, brake: boolean): ClutchStateId {
  if (rpm < ENGAGE_RPM) return 'open';
  return brake ? 'slipping' : 'driving';
}

export function shoesOut(rpm: number): number {
  return smoothstep(rpm, IDLE_RPM, ENGAGE_RPM);
}

export function chainSpeedMs(rpm: number, clutch: ClutchStateId): number {
  if (clutch !== 'driving') return 0;
  return (CHAIN_MM_PER_TURN * rpm) / SECONDS_PER_MINUTE / MM_PER_METRE;
}

export const MAX_CHAIN_SPEED_MS = chainSpeedMs(MAX_POWER_RPM, 'driving');

export function chainTravelMm(crankDeg: number, clutch: ClutchStateId): number {
  return clutch === 'driving' ? (crankDeg / CYCLE_DEG) * CHAIN_MM_PER_TURN : 0;
}

export function wrapChain(mm: number): number {
  return ((mm % CHAIN_LOOP_MM) + CHAIN_LOOP_MM) % CHAIN_LOOP_MM;
}

export function drumDegrees(chainMm: number): number {
  return ((wrapChain(chainMm) % CHAIN_MM_PER_TURN) / CHAIN_MM_PER_TURN) * CYCLE_DEG;
}

export function turnMs(rpm: number): number {
  return (SECONDS_PER_MINUTE * MS_PER_SECOND) / rpm;
}

export function strokesPerSecond(rpm: number): number {
  return rpm / SECONDS_PER_MINUTE;
}

export function kmh(metresPerSecond: number): number {
  return metresPerSecond * KMH_PER_MS;
}

export function cuttersPerSecond(metresPerSecond: number): number {
  return (metresPerSecond * CUTTERS * MM_PER_METRE) / CHAIN_LOOP_MM;
}

export function oiling(clutch: ClutchStateId): boolean {
  return clutch === 'driving';
}
