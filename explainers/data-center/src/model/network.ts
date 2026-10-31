import type { DistanceId } from '../ids';
import { FIBRE_US_PER_KM, HALL_FIBRE_M, SWITCH_NS } from './constants';

export const DISTANCE_KM: Readonly<Record<DistanceId, number>> = { km100: 100, km1000: 1000 };

const ROUND_TRIP_LEGS = 2;
const HALL_SWITCH_HOPS = 3;
const US_PER_MS = 1000;
const NS_PER_US = 1000;
const M_PER_KM = 1000;

export function roundTripMs(km: number): number {
  return (ROUND_TRIP_LEGS * km * FIBRE_US_PER_KM) / US_PER_MS;
}

export function hallPathUs(): number {
  const switchUs = (HALL_SWITCH_HOPS * SWITCH_NS) / NS_PER_US;
  const fibreUs = (HALL_FIBRE_M / M_PER_KM) * FIBRE_US_PER_KM;
  return switchUs + fibreUs;
}
