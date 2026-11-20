import type { Point } from '../ids';

export const ENGINE_LENGTH_M = 5.6;
export const FAN_DIAMETER_M = 3.4;
export const NACELLE_DIAMETER_M = 4.7;
export const PERSON_HEIGHT_M = 1.8;
export const AXIS_HEIGHT_M = 2.6;
export const LIP_X = -2.8;
export const PERSON_POSITION: Point = [-3.6, 0, 2.4];
export const SPIN_SENSE = -1;

export function xAt(fraction: number): number {
  return LIP_X + fraction * ENGINE_LENGTH_M;
}
