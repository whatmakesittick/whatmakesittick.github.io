import { clamp } from '@core/math';
import type { FieldId } from '../ids';
import {
  GAMMA_MHZ_PER_T,
  GRADIENT_MT_PER_M,
  HEAD_HALF_FOV_M,
  MS_PER_S,
  SLEW_T_PER_M_S,
} from './constants';
import { FIELDS } from './field';
import { activeGradient, PHASE_RANGES, phaseOf } from './sequence';

const MT_PER_T = 1000;
const KHZ_PER_MHZ = 1000;
const PERCENT = 100;
export const RAMP_UNITS = 12;

export function edgeShiftMT(): number {
  return GRADIENT_MT_PER_M * HEAD_HALF_FOV_M;
}

export function shareOfField(field: FieldId): number {
  return (edgeShiftMT() / (FIELDS[field].tesla * MT_PER_T)) * PERCENT;
}

export function frequencySpreadKHz(): number {
  return GAMMA_MHZ_PER_T * (edgeShiftMT() / MT_PER_T) * KHZ_PER_MHZ;
}

export function riseTimeMs(): number {
  return (GRADIENT_MT_PER_M / MT_PER_T / SLEW_T_PER_M_S) * MS_PER_S;
}

export function gradientLevel(phase: number): number {
  if (activeGradient(phase) === null) return 0;
  const [start, end] = PHASE_RANGES[phaseOf(phase)];
  const rampUp = (phase - start) / RAMP_UNITS;
  const rampDown = (end - phase) / RAMP_UNITS;
  return clamp(Math.min(rampUp, rampDown), 0, 1);
}
