import { clamp } from '@core/math';
import { ROLL_ARM_M } from './layout';

const HALF_TURN = Math.PI;

export function rollTorque(nozzleN: number): number {
  return 2 * nozzleN * ROLL_ARM_M;
}

function rollAccel(inertia: number, nozzleN: number): number {
  return rollTorque(nozzleN) / inertia;
}

export function rollSeconds(inertia: number, nozzleN: number): number {
  return 2 * Math.sqrt((HALF_TURN * inertia) / rollTorque(nozzleN));
}

export function rollAngleAt(secondsIntoFlip: number, inertia: number, nozzleN: number): number {
  const total = rollSeconds(inertia, nozzleN);
  const elapsed = clamp(secondsIntoFlip, 0, total);
  const accel = rollAccel(inertia, nozzleN);
  if (elapsed <= total / 2) return 0.5 * accel * elapsed ** 2;
  return HALF_TURN - 0.5 * accel * (total - elapsed) ** 2;
}

export function peakRollRate(inertia: number, nozzleN: number): number {
  return (rollAccel(inertia, nozzleN) * rollSeconds(inertia, nozzleN)) / 2;
}
