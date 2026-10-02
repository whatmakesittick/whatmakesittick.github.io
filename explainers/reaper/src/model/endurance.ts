import type { LoadId } from '../ids';
import { AIRSPEED_KMH } from './layout';

export const ENDURANCE_H: Readonly<Record<LoadId, number>> = { clean: 27, armed: 14 };
export const CRUISE_KMH = AIRSPEED_KMH.cruise;
export const RESERVE_H = 1;
export const AREA_DISTANCE_KM = { min: 100, max: 2000, step: 50, default: 400 } as const;

const LEGS_PER_SORTIE = 2;

export function transitHours(distanceKm: number): number {
  return distanceKm / CRUISE_KMH;
}

export function stationHours(distanceKm: number, load: LoadId): number {
  const left = ENDURANCE_H[load] - LEGS_PER_SORTIE * transitHours(distanceKm) - RESERVE_H;
  return Math.max(0, left);
}
