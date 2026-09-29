import { slowMotionFactor } from '@core/playback';
import type { BetaIndex, RingId, SiteState } from '../ids';
import { BETA_INDICES } from '../ids';
import { STATOR_AZIMUTH_DEG } from './scale';

export const FULL_TURN_DEG = 360;
export const HALF_TURN_DEG = 180;
export const ATP_PER_TURN = 3;
export const STEP_DEG = FULL_TURN_DEG / ATP_PER_TURN;

export const BLADE_COUNTS: Readonly<Record<RingId, number>> = {
  animal: 8,
  yeast: 10,
  chloroplast: 14,
};

export const HUMAN_BLADE_COUNT = BLADE_COUNTS.animal;

export const REAL_TURNS_PER_SECOND = 100;
export const REAL_DEGREES_PER_SECOND = REAL_TURNS_PER_SECOND * FULL_TURN_DEG;
export const REAL_TIME_SPEED = 10;

export const BETA_AZIMUTH_DEG: Readonly<Record<BetaIndex, number>> = { 0: 30, 1: 150, 2: 270 };
export const ALPHA_AZIMUTH_DEG: readonly number[] = [90, 210, 330];

export const GATE_HALF_WIDTH_DEG = 15;
export const RELEASE_AZIMUTH_DEG = STATOR_AZIMUTH_DEG - GATE_HALF_WIDTH_DEG;
export const PICKUP_AZIMUTH_DEG = STATOR_AZIMUTH_DEG + GATE_HALF_WIDTH_DEG;
export const CHANNEL_TRAVEL_DEG = 20;

export const MOLECULE_TIMING = {
  bindEnd: 0.5,
  fuseStart: 0.55,
  fuseEnd: 0.8,
  releaseStart: 0.15,
  releaseEnd: 0.85,
} as const;

const STATE_BY_OFFSET: readonly SiteState[] = ['open', 'tight', 'loose'];

const NEXT_STATE: Readonly<Record<SiteState, SiteState>> = {
  open: 'loose',
  loose: 'tight',
  tight: 'open',
};

export interface SiteMotion {
  readonly from: SiteState;
  readonly to: SiteState;
  readonly progress: number;
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function wrapDegrees(degrees: number): number {
  return modulo(degrees, FULL_TURN_DEG);
}

export function degreesPerSecond(speed: number): number {
  return REAL_DEGREES_PER_SECOND / slowMotionFactor(speed, REAL_TIME_SPEED);
}

export function stepIndex(rotorDeg: number): number {
  return Math.min(ATP_PER_TURN - 1, Math.floor(wrapDegrees(rotorDeg) / STEP_DEG));
}

export function stepProgress(rotorDeg: number): number {
  return (wrapDegrees(rotorDeg) - stepIndex(rotorDeg) * STEP_DEG) / STEP_DEG;
}

export function nextSiteState(state: SiteState): SiteState {
  return NEXT_STATE[state];
}

export function siteState(beta: BetaIndex, rotorDeg: number): SiteState {
  return STATE_BY_OFFSET[modulo(beta - stepIndex(rotorDeg), ATP_PER_TURN)];
}

export function siteMotion(beta: BetaIndex, rotorDeg: number): SiteMotion {
  const from = siteState(beta, rotorDeg);
  return { from, to: nextSiteState(from), progress: stepProgress(rotorDeg) };
}

export function betaInState(state: SiteState, rotorDeg: number): BetaIndex {
  const beta = BETA_INDICES.find((index) => siteState(index, rotorDeg) === state);
  if (beta === undefined) throw new Error(`No β subunit is ${state}`);
  return beta;
}

export function axleBulgeAzimuth(rotorDeg: number): number {
  return wrapDegrees(BETA_AZIMUTH_DEG[0] + rotorDeg);
}

export function bladePitchDeg(bladeCount: number): number {
  return FULL_TURN_DEG / bladeCount;
}

export function bladeAzimuth(blade: number, rotorDeg: number, bladeCount: number): number {
  return wrapDegrees(RELEASE_AZIMUTH_DEG + blade * bladePitchDeg(bladeCount) + rotorDeg);
}

export function isCarrying(bladeAzimuthDeg: number): boolean {
  const azimuth = wrapDegrees(bladeAzimuthDeg);
  return azimuth < RELEASE_AZIMUTH_DEG || azimuth >= PICKUP_AZIMUTH_DEG;
}

export function leavingProgress(bladeAzimuthDeg: number): number | null {
  const travelled = wrapDegrees(bladeAzimuthDeg) - RELEASE_AZIMUTH_DEG;
  if (travelled < 0 || travelled >= CHANNEL_TRAVEL_DEG) return null;
  return travelled / CHANNEL_TRAVEL_DEG;
}

export function enteringProgress(bladeAzimuthDeg: number): number | null {
  const remaining = PICKUP_AZIMUTH_DEG - wrapDegrees(bladeAzimuthDeg);
  if (remaining <= 0 || remaining > CHANNEL_TRAVEL_DEG) return null;
  return 1 - remaining / CHANNEL_TRAVEL_DEG;
}

export function atpMade(rotorDeg: number, laps: number): number {
  return laps * ATP_PER_TURN + stepIndex(rotorDeg);
}

export function protonsThrough(rotorDeg: number, laps: number, bladeCount: number): number {
  return laps * bladeCount + Math.floor(wrapDegrees(rotorDeg) / bladePitchDeg(bladeCount));
}

export function protonsPerAtp(bladeCount: number): number {
  return bladeCount / ATP_PER_TURN;
}

export function flowClock(rotorDeg: number, laps: number): number {
  return laps * FULL_TURN_DEG + wrapDegrees(rotorDeg);
}

export function lapCountAfter(previousDeg: number, nextDeg: number, laps: number): number {
  if (nextDeg < previousDeg - HALF_TURN_DEG) return laps + 1;
  if (nextDeg > previousDeg + HALF_TURN_DEG) return laps - 1;
  return laps;
}
