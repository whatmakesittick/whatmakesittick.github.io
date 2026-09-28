import { toRadians } from '@core/math';
import type { PlanPoint } from '../../model';

export function aroundHook(hookDegrees: number, radius: number): PlanPoint {
  const radians = toRadians(hookDegrees);
  return { x: -radius * Math.sin(radians), z: -radius * Math.cos(radians) };
}

export function hookSectorPoints(
  from: number,
  to: number,
  inner: number,
  outer: number,
  steps: number,
): PlanPoint[] {
  const outerEdge = Array.from({ length: steps + 1 }, (_, index) =>
    aroundHook(from + ((to - from) * index) / steps, outer),
  );
  const innerEdge = Array.from({ length: steps + 1 }, (_, index) =>
    aroundHook(to - ((to - from) * index) / steps, inner),
  );
  return [...outerEdge, ...innerEdge];
}

export function circlePoints(
  radius: number,
  steps: number,
  center: PlanPoint = { x: 0, z: 0 },
): PlanPoint[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = toRadians((360 * index) / steps);
    return { x: center.x + radius * Math.cos(angle), z: center.z + radius * Math.sin(angle) };
  });
}
