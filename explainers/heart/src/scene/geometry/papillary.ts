import { Vector3 } from 'three';
import type { Field, Vec3 } from './field';

const MAX_REACH_MM = 60;

export function wallBase(
  cavity: Field,
  tip: Vec3,
  toward: Vec3,
  depthMm: number,
  stepMm: number,
): Vector3 {
  const direction = new Vector3(...toward).normalize();
  const point = new Vector3(...tip);
  for (let travelled = 0; travelled < MAX_REACH_MM; travelled += stepMm) {
    if (cavity.distance(point.x, point.y, point.z) > depthMm) return point;
    point.addScaledVector(direction, stepMm);
  }
  return point;
}

export function spokes(from: Vector3, to: Vector3, count: number): Vector3[] {
  return Array.from({ length: count + 1 }, (_, index) => from.clone().lerp(to, index / count));
}
