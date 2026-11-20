import { clamp, lerp } from '@core/math';
import type { PhaseId } from '../ids';
import { axialAt } from './stations';

export type StreamPath = 'core' | 'cold';

export type ToneId = 'cool' | 'squeeze' | 'fire' | 'ember' | 'exhaust';

export const HEAT_IDLE = 0.15;
export const FLAME_IDLE = 0.35;
export const HPT_HEAT = 0.95;
export const LPT_ENTRY_HEAT = 0.7;
export const LPT_TAIL_HEAT = 0.1;

const COMBUSTOR_START = 0.53;
const COMBUSTOR_END = 0.63;
const HPT_END = 0.69;
const LPT_END = 0.88;

export function heatLevel(lever: number): number {
  return lerp(HEAT_IDLE, 1, clamp(lever, 0, 1));
}

export function flameRing(lever: number): number {
  return lerp(FLAME_IDLE, 1, clamp(lever, 0, 1));
}

function profileAt(fraction: number): number {
  if (fraction < COMBUSTOR_START) return 0;
  if (fraction < COMBUSTOR_END) return 1;
  if (fraction < HPT_END) return HPT_HEAT;
  if (fraction < LPT_END) {
    const share = (fraction - HPT_END) / (LPT_END - HPT_END);
    return lerp(LPT_ENTRY_HEAT, LPT_TAIL_HEAT, share);
  }
  return LPT_TAIL_HEAT;
}

export function heatAlong(units: number, lever: number): number {
  return profileAt(axialAt(units)) * heatLevel(lever);
}

const CORE_TONES: Readonly<Record<PhaseId, ToneId>> = {
  suck: 'cool',
  squeeze: 'squeeze',
  burn: 'fire',
  spin: 'ember',
  blow: 'exhaust',
};

export function stationTone(phase: PhaseId, path: StreamPath): ToneId {
  if (path === 'cold') return phase === 'blow' ? 'exhaust' : 'cool';
  return CORE_TONES[phase];
}
