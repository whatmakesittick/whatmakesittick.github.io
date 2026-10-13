import type { BufferGeometry } from 'three';
import { mergeParts } from './merge';
import { extrudeAlongZ, roundedOutline } from './profile';
import type { Outline, Span } from './profile';

export type ShellSide = 'back' | 'front';

const MIN_RADIUS = 0.002;

function edgeNormal(
  from: readonly [number, number],
  to: readonly [number, number],
): [number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  return [-dy / length, dx / length];
}

export function insetOutline(points: Outline, distance: number): Outline {
  const count = points.length;
  return points.map((point, index) => {
    const previous = points[(index + count - 1) % count];
    const next = points[(index + 1) % count];
    const [ax, ay] = edgeNormal(previous, point);
    const [bx, by] = edgeNormal(point, next);
    const sumX = ax + bx;
    const sumY = ay + by;
    const scale = distance / Math.max(0.2, sumX * ax + sumY * ay);
    return [point[0] + sumX * scale, point[1] + sumY * scale] as const;
  });
}

export interface ShellSpec {
  outline: Outline;
  radius: number;
  wall: number;
  depth: Span;
  bevel: number;
}

export function shellHalf(spec: ShellSpec, side: ShellSide): BufferGeometry {
  const { outline, radius, wall, depth, bevel } = spec;
  const ring = roundedOutline(outline, radius);
  ring.holes.push(roundedOutline(insetOutline(outline, wall), Math.max(MIN_RADIUS, radius - wall)));
  const plate = roundedOutline(outline, radius);
  const plateSpan =
    side === 'back'
      ? { from: depth.from, to: depth.from + wall }
      : { from: depth.to - wall, to: depth.to };
  const ringSpan =
    side === 'back'
      ? { from: depth.from + wall, to: depth.to }
      : { from: depth.from, to: depth.to - wall };
  return mergeParts([
    extrudeAlongZ(ring, ringSpan),
    extrudeAlongZ(plate, plateSpan, Math.min(bevel, wall)),
  ]);
}

export function solidBody(spec: Omit<ShellSpec, 'wall'>): BufferGeometry {
  return extrudeAlongZ(roundedOutline(spec.outline, spec.radius), spec.depth, spec.bevel);
}
