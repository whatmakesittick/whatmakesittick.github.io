import { degreesForward, normalizeAngle, normalizeRevolution } from './cycle';
import type { EngineSpec } from './spec';

export const CAM_TO_CRANK_RATIO = 0.5;

export function valveDuration(open: number, close: number): number {
  return degreesForward(open, close);
}

export function valveLift(angle: number, open: number, close: number, maxLift: number): number {
  const duration = valveDuration(open, close);
  const elapsed = degreesForward(open, angle);
  if (elapsed >= duration) return 0;
  const phase = elapsed / duration;
  const shape = Math.sin(Math.PI * phase);
  return maxLift * shape * shape;
}

export function intakeLift(angle: number, spec: EngineSpec): number {
  const { intakeOpen, intakeClose } = spec.valveTiming;
  return valveLift(angle, intakeOpen, intakeClose, spec.maxValveLift);
}

export function exhaustLift(angle: number, spec: EngineSpec): number {
  const { exhaustOpen, exhaustClose } = spec.valveTiming;
  return valveLift(angle, exhaustOpen, exhaustClose, spec.maxValveLift);
}

export function isIntakeOpen(angle: number, spec: EngineSpec): boolean {
  return intakeLift(angle, spec) > 0;
}

export function isExhaustOpen(angle: number, spec: EngineSpec): boolean {
  return exhaustLift(angle, spec) > 0;
}

export function camAngle(crankAngle: number): number {
  return normalizeRevolution(normalizeAngle(crankAngle) * CAM_TO_CRANK_RATIO);
}

export function valveOverlap(spec: EngineSpec): number {
  const { intakeOpen, exhaustClose } = spec.valveTiming;
  return degreesForward(intakeOpen, exhaustClose);
}
