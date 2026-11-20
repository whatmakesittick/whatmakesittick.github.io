import { clamp } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { MomentId, PhaseId } from '../ids';
import { ENGINE_LENGTH_M } from './scale';

export const CYCLE_UNITS = 1000;
export const UNITS_PER_SECOND_AT_MODEL_PACE = 80;
export const SPEED_RANGE = { min: 0.25, max: 3, step: 0.25, default: 1 } as const;

export const PHASE_RANGES: Readonly<Record<PhaseId, { start: number; end: number }>> = {
  suck: { start: 0, end: 150 },
  squeeze: { start: 150, end: 450 },
  burn: { start: 450, end: 570 },
  spin: { start: 570, end: 800 },
  blow: { start: 800, end: 1000 },
};

export const PHASE_AXIAL: Readonly<Record<PhaseId, { start: number; end: number }>> = {
  suck: { start: 0, end: 0.13 },
  squeeze: { start: 0.13, end: 0.53 },
  burn: { start: 0.53, end: 0.63 },
  spin: { start: 0.63, end: 0.88 },
  blow: { start: 0.88, end: 1 },
};

export const STATIONS = {
  lip: 0,
  fanFace: 0.05,
  fanExit: 0.13,
  boosterExit: 0.24,
  compressorExit: 0.53,
  combustorExit: 0.63,
  hptExit: 0.69,
  lptExit: 0.88,
  nozzle: 1,
} as const;

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  intake: 0,
  behindFan: 150,
  compressorExit: 450,
  combustorExit: 570,
  turbinesExit: 800,
};

export function phaseIdAt(units: number): PhaseId {
  const at = clamp(units, 0, CYCLE_UNITS - Number.EPSILON);
  return PHASE_IDS.find((id) => at < PHASE_RANGES[id].end) ?? 'blow';
}

export function phaseProgress(units: number): number {
  const { start, end } = PHASE_RANGES[phaseIdAt(units)];
  return clamp((units - start) / (end - start), 0, 1);
}

export function axialAt(units: number): number {
  const id = phaseIdAt(units);
  const axial = PHASE_AXIAL[id];
  return axial.start + phaseProgress(units) * (axial.end - axial.start);
}

export function unitsAt(fraction: number): number {
  const at = clamp(fraction, 0, 1);
  const id = PHASE_IDS.find((phase) => at <= PHASE_AXIAL[phase].end) ?? 'blow';
  const axial = PHASE_AXIAL[id];
  const units = PHASE_RANGES[id];
  const share = (at - axial.start) / (axial.end - axial.start);
  return units.start + share * (units.end - units.start);
}

export function metresAt(units: number): number {
  return axialAt(units) * ENGINE_LENGTH_M;
}

export function rate(speed: number): number {
  return speed * UNITS_PER_SECOND_AT_MODEL_PACE;
}

export function secondsPerLoop(speed: number): number {
  return CYCLE_UNITS / rate(speed);
}
