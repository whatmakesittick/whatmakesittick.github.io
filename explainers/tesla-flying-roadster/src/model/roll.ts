import { clamp } from '@core/math';
import { ROLL_ARM_M } from './layout';

const HALF_TURN = Math.PI;

export function rollTorque(nozzleN: number): number {
  return 2 * nozzleN * ROLL_ARM_M;
}

function rollAccel(inertia: number, nozzleN: number): number {
  return rollTorque(nozzleN) / inertia;
}

export function rollSeconds(inertia: number, nozzleN: number, angle = HALF_TURN): number {
  return 2 * Math.sqrt((angle * inertia) / rollTorque(nozzleN));
}

export function rollAngleAt(
  secondsIntoRoll: number,
  inertia: number,
  nozzleN: number,
  angle = HALF_TURN,
): number {
  const total = rollSeconds(inertia, nozzleN, angle);
  const elapsed = clamp(secondsIntoRoll, 0, total);
  const accel = rollAccel(inertia, nozzleN);
  if (elapsed <= total / 2) return 0.5 * accel * elapsed ** 2;
  return angle - 0.5 * accel * (total - elapsed) ** 2;
}

export function peakRollRate(inertia: number, nozzleN: number, angle = HALF_TURN): number {
  return (rollAccel(inertia, nozzleN) * rollSeconds(inertia, nozzleN, angle)) / 2;
}
