import { clamp } from '@core/math';
import { HORIZON_RADIUS, RELEASE_RADIUS, RS_LIGHT_SECONDS } from './constants';

const CENTRE_ETA = Math.PI;
const BISECTION_TOLERANCE = 1e-9;
const BISECTION_STEPS = 80;

const TIME_SCALE = (RELEASE_RADIUS ** 1.5 / 2) * RS_LIGHT_SECONDS;

export const ENERGY = Math.sqrt(1 - HORIZON_RADIUS / RELEASE_RADIUS);

export function radiusAtEta(eta: number): number {
  return (RELEASE_RADIUS / 2) * (1 + Math.cos(eta));
}

export function tauAtEta(eta: number): number {
  return TIME_SCALE * (eta + Math.sin(eta));
}

export function etaAtRadius(radius: number): number {
  const cosine = clamp((2 * radius) / RELEASE_RADIUS - 1, -1, 1);
  return Math.acos(cosine);
}

export function tauAtRadius(radius: number): number {
  return tauAtEta(etaAtRadius(radius));
}

export const HORIZON_TIME = tauAtRadius(HORIZON_RADIUS);
export const CENTRE_TIME = tauAtEta(CENTRE_ETA);

export function etaAtTau(tau: number): number {
  const target = clamp(tau, 0, CENTRE_TIME);
  let low = 0;
  let high = CENTRE_ETA;
  for (let step = 0; step < BISECTION_STEPS && high - low > BISECTION_TOLERANCE; step++) {
    const middle = (low + high) / 2;
    if (tauAtEta(middle) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function radiusAtTau(tau: number): number {
  return clamp(radiusAtEta(etaAtTau(tau)), 0, RELEASE_RADIUS);
}

export function localSpeed(radius: number): number {
  if (radius <= HORIZON_RADIUS) return 1;
  const share = (1 - HORIZON_RADIUS / radius) / ENERGY ** 2;
  return Math.sqrt(clamp(1 - share, 0, 1));
}

export function timeLeft(tau: number): number {
  return Math.max(0, CENTRE_TIME - tau);
}
