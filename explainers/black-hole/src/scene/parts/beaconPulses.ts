import { clamp, smoothstep } from '@core/math';
import { FLASH_INTERVAL_S, clockRatio } from '../../model';
import { BEACON } from '../constants';
import { FLASH_SPEED } from '../layout';

export interface Pulse {
  emittedAt: number;
  travelled: number;
  ratio: number;
}

export interface PulseTint {
  share: number;
  alpha: number;
}

export function pulsesInFlight(tau: number, limit = BEACON.maxPulses): Pulse[] {
  const pulses: Pulse[] = [];
  const latest = Math.floor(tau / FLASH_INTERVAL_S);
  for (let index = latest; index >= 0 && pulses.length < limit; index -= 1) {
    const emittedAt = index * FLASH_INTERVAL_S;
    const travelled = (tau - emittedAt) * FLASH_SPEED;
    if (travelled > BEACON.maxPath) break;
    pulses.push({ emittedAt, travelled, ratio: clockRatio(emittedAt) });
  }
  return pulses;
}

export function pulseTint(ratio: number): PulseTint {
  const share = clamp((ratio - 1) / (BEACON.redRatio - 1), 0, 1);
  const alpha = 1 - smoothstep(ratio, BEACON.redRatio, BEACON.goneRatio);
  return { share, alpha: Number.isFinite(ratio) ? alpha : 0 };
}

export function arrivalFade(travelled: number, pathLength: number): number {
  if (pathLength <= 0) return 0;
  return 1 - smoothstep(travelled / pathLength, BEACON.arrivalFadeStart, 1);
}

export function beaconPulseShare(tau: number): number {
  const share = (tau % FLASH_INTERVAL_S) / FLASH_INTERVAL_S;
  return share < 0 ? share + 1 : share;
}
