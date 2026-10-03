import { SEA_STATE_IDS } from '../ids';
import type { SeaStateId } from '../ids';
import { BOAT } from './layout';
import { knotsToMs } from './scale';

export const RADAR_K = 4.12;
export const VISUAL_K = 3.86;
export const TARGET_HEIGHT_M = 0.5;
export const LENS_HEIGHT_M = BOAT.lensHeight;
export const RADAR_HEIGHT_M = { min: 5, max: 50, step: 1, default: 20 } as const;
export const DETECTION_KM = 9.26;
export const METRES_PER_KM = 1000;
export const SECONDS_PER_MINUTE = 60;

const DETECTION_COVERED_UP_TO: SeaStateId = 'moderate';
const HIDDEN_FROM: SeaStateId = 'slight';

export function radarLineOfSightKm(radarHeight: number): number {
  return RADAR_K * (Math.sqrt(radarHeight) + Math.sqrt(TARGET_HEIGHT_M));
}

export function visualHorizonKm(eyeHeight: number): number {
  return VISUAL_K * Math.sqrt(eyeHeight);
}

export function minutesAtTopSpeed(km: number): number {
  const seconds = (km * METRES_PER_KM) / knotsToMs(BOAT.topKnots);
  return seconds / SECONDS_PER_MINUTE;
}

export function surfaceDropM(km: number): number {
  return (km / RADAR_K) ** 2;
}

function seaRank(state: SeaStateId): number {
  return SEA_STATE_IDS.indexOf(state);
}

export function detectionCovered(state: SeaStateId): boolean {
  return seaRank(state) <= seaRank(DETECTION_COVERED_UP_TO);
}

export function hiddenUpToHalf(state: SeaStateId): boolean {
  return seaRank(state) >= seaRank(HIDDEN_FROM);
}
