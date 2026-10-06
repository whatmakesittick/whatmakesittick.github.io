import { Vector2 } from 'three';

export type Loop = readonly Vector2[];

export interface Profile {
  outer: Loop;
  holes: readonly Loop[];
}

export function quadratic(from: Vector2, control: Vector2, to: Vector2, steps: number): Vector2[] {
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    const u = 1 - t;
    return new Vector2(
      u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    );
  });
}

export function roundCorners(corners: Loop, radius: number, steps: number): Vector2[] {
  return corners.flatMap((corner, index) => {
    const previous = corners[(index + corners.length - 1) % corners.length];
    const next = corners[(index + 1) % corners.length];
    const reach = Math.min(radius, corner.distanceTo(previous) / 2, corner.distanceTo(next) / 2);
    if (reach <= 0) return [corner.clone()];
    const start = previous.clone().sub(corner).setLength(reach).add(corner);
    const end = next.clone().sub(corner).setLength(reach).add(corner);
    return [start, ...quadratic(start, corner, end, steps)];
  });
}

export function rectLoop(inner: number, outer: number, from: number, to: number): Vector2[] {
  return [
    new Vector2(inner, from),
    new Vector2(outer, from),
    new Vector2(outer, to),
    new Vector2(inner, to),
  ];
}

export function signedArea(loop: Loop): number {
  return (
    loop.reduce((sum, point, index) => {
      const next = loop[(index + 1) % loop.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}

export function oriented(loop: Loop, counterClockwise: boolean): Loop {
  return signedArea(loop) > 0 === counterClockwise ? loop : [...loop].reverse();
}

function vertexNormal(path: Loop, index: number): Vector2 {
  const previous = path[Math.max(index - 1, 0)];
  const next = path[Math.min(index + 1, path.length - 1)];
  const tangent = next.clone().sub(previous).normalize();
  return new Vector2(-tangent.y, tangent.x);
}

export function thickenPath(path: Loop, thickness: number): Vector2[] {
  const offset = path.map((point, index) =>
    vertexNormal(path, index).multiplyScalar(thickness).add(point),
  );
  return [...path.map((point) => point.clone()), ...offset.reverse()];
}

export function hollowRect(
  inner: number,
  outer: number,
  halfLength: number,
  wall: number,
  corner: number,
  steps: number,
): Profile {
  return {
    outer: roundCorners(rectLoop(inner, outer, -halfLength, halfLength), corner, steps),
    holes: [
      roundCorners(
        rectLoop(inner + wall, outer - wall, wall - halfLength, halfLength - wall),
        Math.max(corner - wall, 0),
        steps,
      ),
    ],
  };
}
