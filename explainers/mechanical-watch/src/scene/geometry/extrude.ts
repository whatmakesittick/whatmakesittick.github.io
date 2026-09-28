import { ExtrudeGeometry, LatheGeometry, Path, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import type { Vec2 } from './outline';

export interface Bevel {
  readonly size: number;
  readonly segments: number;
}

const FLAT_CURVE_SEGMENTS = 1;

function vectors(points: readonly Vec2[]): Vector2[] {
  return points.map((point) => new Vector2(point.x, point.y));
}

export function shapeOf(outline: readonly Vec2[], holes: readonly (readonly Vec2[])[] = []): Shape {
  const shape = new Shape(vectors(outline));
  holes.forEach((hole) => shape.holes.push(new Path(vectors(hole))));
  return shape;
}

export function extrudeZ(
  shape: Shape | readonly Shape[],
  bottom: number,
  top: number,
  bevel?: Bevel,
): BufferGeometry {
  const inset = bevel ? Math.min(bevel.size, (top - bottom) / 3) : 0;
  const geometry = new ExtrudeGeometry(shape as Shape | Shape[], {
    depth: top - bottom - inset * 2,
    curveSegments: FLAT_CURVE_SEGMENTS,
    bevelEnabled: Boolean(bevel),
    bevelThickness: inset,
    bevelSize: inset,
    bevelOffset: -inset,
    bevelSegments: bevel?.segments ?? 1,
  });
  geometry.translate(0, 0, bottom + inset);
  return geometry;
}

export function extrudeOutline(
  outline: readonly Vec2[],
  bottom: number,
  top: number,
  holes: readonly (readonly Vec2[])[] = [],
  bevel?: Bevel,
): BufferGeometry {
  return extrudeZ(shapeOf(outline, holes), bottom, top, bevel);
}

export type LathePoint = readonly [radius: number, z: number];

export function latheZ(
  profile: readonly LathePoint[],
  segments: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
): BufferGeometry {
  const points = profile.map(([radius, z]) => new Vector2(radius, z));
  const geometry = new LatheGeometry(points, segments, phiStart, phiLength);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
