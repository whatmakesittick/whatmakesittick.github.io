import type { GroundPoint } from '../../../model/layout';

export function turnedGround(x: number, z: number, turn: number): GroundPoint {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return [x * cos + z * sin, -x * sin + z * cos];
}

export function quantise(value: number, step: number): number {
  return Math.round(value / step) * step;
}
