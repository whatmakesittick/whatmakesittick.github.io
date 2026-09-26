import {
  CYCLE_DEGREES,
  FIRING_TDC,
  STROKE_START,
  degreesForward,
  isWithinWindow,
  normalizeAngle,
  strokeProgress,
} from './cycle';
import { cylinderVolume } from './kinematics';
import type { EngineSpec, IgnitionKind } from './spec';

export type GasPhase = 'fresh' | 'compressed' | 'burning' | 'burnt';

export interface GasState {
  phase: GasPhase;
  fill: number;
  compression: number;
  heat: number;
  pressure: number;
  ignitionActive: boolean;
}

const POLYTROPIC_EXPONENT = 1.3;
const WIEBE_EFFICIENCY = 5;
const WIEBE_SHAPE: Record<IgnitionKind, number> = { spark: 2, compression: 1.2 };
const HEAT_RISE_DEGREES: Record<IgnitionKind, number> = { spark: 4, compression: 12 };
const BLOWDOWN_DEGREES = 40;
const EXHAUST_BACKPRESSURE = 1.05;
const INTAKE_DEPRESSION = 0.95;
const RESIDUAL_FILL = 0.1;
const BURNING_HEAT_THRESHOLD = 0.08;
const AFTERGLOW_DEGREES = 200;

export function ignitionStart(spec: EngineSpec): number {
  return normalizeAngle(FIRING_TDC - spec.ignitionEvent.advance);
}

export function combustionStart(spec: EngineSpec): number {
  return normalizeAngle(ignitionStart(spec) + spec.ignitionDelay);
}

export function isIgnitionActive(angle: number, spec: EngineSpec): boolean {
  return isWithinWindow(angle, ignitionStart(spec), spec.ignitionEvent.duration);
}

export function burnedFraction(angle: number, spec: EngineSpec): number {
  const start = combustionStart(spec);
  const elapsed = degreesForward(start, angle);
  if (elapsed >= CYCLE_DEGREES - start) return 0;
  if (elapsed >= spec.burnDuration) return 1;
  const shape = WIEBE_SHAPE[spec.ignition];
  return 1 - Math.exp(-WIEBE_EFFICIENCY * Math.pow(elapsed / spec.burnDuration, shape + 1));
}

export function isInClosedPhase(angle: number, spec: EngineSpec): boolean {
  const start = STROKE_START.compression;
  const end = spec.valveTiming.exhaustOpen;
  return degreesForward(start, angle) < degreesForward(start, end);
}

function motoredPressure(angle: number, spec: EngineSpec): number {
  const bottom = cylinderVolume(STROKE_START.compression, spec);
  return Math.pow(bottom / cylinderVolume(angle, spec), POLYTROPIC_EXPONENT);
}

function closedPressure(angle: number, spec: EngineSpec): number {
  const gain = spec.combustionPressureGain * burnedFraction(angle, spec);
  return motoredPressure(angle, spec) * (1 + gain);
}

function blowdownPressure(sinceOpen: number, spec: EngineSpec): number {
  const atOpen = closedPressure(spec.valveTiming.exhaustOpen, spec);
  const decay = 1 - sinceOpen / BLOWDOWN_DEGREES;
  return EXHAUST_BACKPRESSURE + (atOpen - EXHAUST_BACKPRESSURE) * decay * decay;
}

export function relativePressure(angle: number, spec: EngineSpec): number {
  const a = normalizeAngle(angle);
  if (isInClosedPhase(a, spec)) return closedPressure(a, spec);
  const sinceOpen = degreesForward(spec.valveTiming.exhaustOpen, a);
  if (sinceOpen < BLOWDOWN_DEGREES) return blowdownPressure(sinceOpen, spec);
  return a < STROKE_START.compression ? INTAKE_DEPRESSION : EXHAUST_BACKPRESSURE;
}

export function peakMotoredPressure(spec: EngineSpec): number {
  return motoredPressure(FIRING_TDC, spec);
}

export function peakPressure(spec: EngineSpec): number {
  let peak = 0;
  for (let a = STROKE_START.compression; a < spec.valveTiming.exhaustOpen; a += 1) {
    peak = Math.max(peak, closedPressure(a, spec));
  }
  return peak;
}

export function heat(angle: number, spec: EngineSpec): number {
  const elapsed = degreesForward(combustionStart(spec), angle);
  if (elapsed > spec.burnDuration + AFTERGLOW_DEGREES) return 0;
  const rise = HEAT_RISE_DEGREES[spec.ignition];
  const ramp = Math.min(1, elapsed / rise);
  const decay = Math.exp(-Math.max(0, elapsed - rise) / spec.burnDuration);
  return ramp * decay;
}

function fill(angle: number): number {
  const a = normalizeAngle(angle);
  if (a < STROKE_START.compression) return RESIDUAL_FILL + (1 - RESIDUAL_FILL) * strokeProgress(a);
  if (a >= STROKE_START.exhaust) return 1 - (1 - RESIDUAL_FILL) * strokeProgress(a);
  return 1;
}

function compression(angle: number, spec: EngineSpec): number {
  if (!isInClosedPhase(angle, spec)) return 0;
  const normalized = (motoredPressure(angle, spec) - 1) / (peakMotoredPressure(spec) - 1);
  return Math.min(1, Math.max(0, normalized));
}

function phase(angle: number, spec: EngineSpec, heatLevel: number): GasPhase {
  const a = normalizeAngle(angle);
  if (heatLevel > BURNING_HEAT_THRESHOLD) return 'burning';
  if (a < STROKE_START.compression) return 'fresh';
  if (a < combustionStart(spec)) return 'compressed';
  return 'burnt';
}

export function gasState(angle: number, spec: EngineSpec): GasState {
  const heatLevel = heat(angle, spec);
  return {
    phase: phase(angle, spec, heatLevel),
    fill: fill(angle),
    compression: compression(angle, spec),
    heat: heatLevel,
    pressure: relativePressure(angle, spec),
    ignitionActive: isIgnitionActive(angle, spec),
  };
}
