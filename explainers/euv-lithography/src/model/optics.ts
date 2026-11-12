import type { MachineId, OpticsId } from '../ids';
import { MACHINE_OPTICS, MASK_TILT_DEG } from './constants';
import { LINE_NM, mm } from './scale';

const PITCH_FACTOR = 2;
const MASK_STROKE_M = mm(132);
const SLIT_MM = { na033: { w: 26, h: 2 }, na055: { w: 26, h: 1.6 } } as const;
const FIELD_MM = { na033: { w: 26, h: 33 }, na055: { w: 26, h: 16.5 } } as const;
const SHRINK = { na033: { slit: 4, scan: 4 }, na055: { slit: 4, scan: 8 } } as const;

export function opticsOf(machine: MachineId): OpticsId {
  return MACHINE_OPTICS[machine];
}

export function shrinkRatio(optics: OpticsId): { slit: number; scan: number } {
  return { ...SHRINK[optics] };
}

export function fieldMm(optics: OpticsId): { w: number; h: number } {
  return { ...FIELD_MM[optics] };
}

export function slitMm(optics: OpticsId): { w: number; h: number } {
  return { ...SLIT_MM[optics] };
}

export function smallestHalfPitchNm(optics: OpticsId): number {
  return LINE_NM[optics];
}

export function pitchNm(optics: OpticsId): number {
  return LINE_NM[optics] * PITCH_FACTOR;
}

export function maskTiltDeg(optics: OpticsId): number {
  return MASK_TILT_DEG[optics];
}

export function strokeM(optics: OpticsId): { mask: number; wafer: number } {
  return { mask: MASK_STROKE_M, wafer: MASK_STROKE_M / SHRINK[optics].scan };
}
