import type { FlashTone } from '../ids';
import {
  FLASH_INTERVAL_S,
  HORIZON_RADIUS,
  RELEASE_RADIUS,
  RS_LIGHT_SECONDS,
  SHIP_RADIUS,
} from './constants';
import { ENERGY, etaAtTau, radiusAtEta, radiusAtTau, tauAtEta } from './fall';

const ORBIT_CLOCK_FACTOR_NUMERATOR = 1.5;
const DIMMING_POWER = 4;
const HORIZON_MARGIN = 1e-6;
const FLASH_TONE_LIMITS: readonly (readonly [FlashTone, number])[] = [
  ['white', 1.3],
  ['orange', 2.5],
  ['red', 8],
  ['infrared', 60],
];

export const SHIP_CLOCK_FACTOR = Math.sqrt(1 - ORBIT_CLOCK_FACTOR_NUMERATOR / SHIP_RADIUS);

function outside(radius: number): boolean {
  return radius > HORIZON_RADIUS + HORIZON_MARGIN;
}

export function staticDilation(radius: number): number {
  return outside(radius) ? Math.sqrt(1 - HORIZON_RADIUS / radius) : 0;
}

export function coordinateTime(eta: number): number {
  const radius = radiusAtEta(eta);
  if (!outside(radius)) return Infinity;
  const a = Math.sqrt(RELEASE_RADIUS - 1);
  const half = Math.tan(eta / 2);
  const logTerm = Math.log(Math.abs((a + half) / (a - half)));
  const driftTerm = a * (eta + (RELEASE_RADIUS / 2) * (eta + Math.sin(eta)));
  return RS_LIGHT_SECONDS * (logTerm + driftTerm);
}

export function lightTravelTime(fromRadius: number, toRadius: number): number {
  if (!outside(fromRadius)) return Infinity;
  const climb = toRadius - fromRadius;
  const delay = Math.log((toRadius - HORIZON_RADIUS) / (fromRadius - HORIZON_RADIUS));
  return RS_LIGHT_SECONDS * (climb + delay);
}

export function arrivalTime(tau: number): number {
  const eta = etaAtTau(tau);
  return coordinateTime(eta) + lightTravelTime(radiusAtEta(eta), SHIP_RADIUS);
}

const ARRIVAL_AT_RELEASE = arrivalTime(0);

export function shipClock(tau: number): number {
  return (arrivalTime(tau) - ARRIVAL_AT_RELEASE) * SHIP_CLOCK_FACTOR;
}

export function redshift(radius: number): number {
  if (!outside(radius)) return Infinity;
  const potential = 1 - HORIZON_RADIUS / radius;
  const infall = Math.sqrt(Math.max(ENERGY ** 2 - potential, 0));
  return (ENERGY + infall) / potential;
}

export function clockRatio(tau: number): number {
  return redshift(radiusAtTau(tau)) * SHIP_CLOCK_FACTOR;
}

export function flashGap(tau: number): number {
  return FLASH_INTERVAL_S * clockRatio(tau);
}

export function dimming(tau: number): number {
  const shift = redshift(radiusAtTau(tau));
  return Number.isFinite(shift) ? shift ** -DIMMING_POWER : 0;
}

export function flashTone(tau: number): FlashTone {
  const ratio = clockRatio(tau);
  const match = FLASH_TONE_LIMITS.find(([, limit]) => ratio < limit);
  return match ? match[0] : 'gone';
}

export { tauAtEta };
