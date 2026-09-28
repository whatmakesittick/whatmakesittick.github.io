import { Vector3 } from 'three';

export interface MooringLine {
  fairlead: Vector3;
  heading: Vector3;
  reach: number;
  drop: number;
}

export function mooringPoint(line: MooringLine, share: number, target = new Vector3()): Vector3 {
  const sag = line.drop * (2 * share - share * share);
  return target
    .copy(line.fairlead)
    .addScaledVector(line.heading, line.reach * share)
    .setY(line.fairlead.y - sag);
}

export function mooringPoints(line: MooringLine, segments: number): Vector3[] {
  return Array.from({ length: segments + 1 }, (_, index) => mooringPoint(line, index / segments));
}

export function shareAtLength(line: MooringLine, length: number, samples: number): number {
  let travelled = 0;
  const previous = mooringPoint(line, 0);
  const next = new Vector3();
  for (let index = 1; index <= samples; index++) {
    const share = index / samples;
    travelled += mooringPoint(line, share, next).distanceTo(previous);
    if (travelled >= length) return share;
    previous.copy(next);
  }
  return 1;
}
