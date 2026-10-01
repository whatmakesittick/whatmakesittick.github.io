import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import { latheAlongX } from '@core/scene/geometry/lathe';
import type { LatheArc } from '@core/scene/geometry/lathe';

export type TurnPoint = readonly [x: number, radius: number];

export type TurnStrand = readonly TurnPoint[];

export const WHOLE_TURN: LatheArc = { start: 0, length: FULL_TURN };

export const KEPT_HALF: LatheArc = { start: FULL_TURN / 4, length: FULL_TURN / 2 };

const SAME_POINT = 1e-6;
const XYZ = 3;

function samePoint(a: TurnPoint, b: TurnPoint): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= SAME_POINT;
}

function turnStrand(strand: TurnStrand, segments: number, arc: LatheArc): BufferGeometry {
  const profile = strand.map(([x, radius]) => new Vector2(radius, x));
  const arcSegments = Math.max(1, Math.round((segments * arc.length) / FULL_TURN));
  return latheAlongX(profile, arcSegments, arc);
}

export function turnStrands(
  strands: readonly TurnStrand[],
  segments: number,
  arc: LatheArc = WHOLE_TURN,
): BufferGeometry {
  const parts = strands.map((strand) => turnStrand(strand, segments, arc));
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge turned strands');
  return merged;
}

export function turnOutline(strands: readonly TurnStrand[]): TurnPoint[] {
  const outline: TurnPoint[] = [];
  for (const point of strands.flat()) {
    const last = outline[outline.length - 1];
    if (!last || !samePoint(last, point)) outline.push(point);
  }
  if (outline.length > 1 && samePoint(outline[0], outline[outline.length - 1])) outline.pop();
  return outline;
}

function isCounterClockwise(points: readonly TurnPoint[], [a, b, c]: readonly number[]): boolean {
  const [ax, ay] = points[a];
  const [bx, by] = points[b];
  const [cx, cy] = points[c];
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 0;
}

export function turnedCap(outline: readonly TurnPoint[]): BufferGeometry {
  const faces = ShapeUtils.triangulateShape(
    outline.map(([x, radius]) => new Vector2(x, radius)),
    [],
  );
  const positions: number[] = [];
  const normals: number[] = [];
  for (const side of [1, -1]) {
    for (const [x, radius] of outline) {
      positions.push(x, side * radius, 0);
      normals.push(0, 0, 1);
    }
  }
  const count = outline.length;
  const indices: number[] = [];
  for (const face of faces) {
    const [a, b, c] = isCounterClockwise(outline, face) ? face : [face[0], face[2], face[1]];
    indices.push(a, b, c, count + a, count + c, count + b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, XYZ));
  geometry.setIndex(indices);
  return geometry;
}
