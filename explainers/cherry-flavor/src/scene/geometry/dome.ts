import { BufferAttribute, BufferGeometry, Vector2 } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { Point } from '../../ids';

export interface DomeShape {
  readonly centre: Point;
  readonly slab: number;
  readonly depth: number;
  readonly rings: number;
  readonly power: number;
  readonly rounding: number;
  depthAt(point: Vector2): number;
}

const XYZ = 3;
const QUARTER = Math.PI / 2;

export function bulgeDepth(
  head: number,
  nose: number,
  fromX: number,
  toX: number,
): (point: Vector2) => number {
  return (point) => lerp(head, nose, smoothstep(point.x, fromX, toX));
}

function blurred(outline: readonly Vector2[], radius: number): Vector2[] {
  if (radius < 1) return outline.map((point) => point.clone());
  const count = outline.length;
  const width = radius * 2 + 1;
  return outline.map((_, index) => {
    const sum = new Vector2();
    for (let step = -radius; step <= radius; step += 1) {
      sum.add(outline[(index + step + count) % count]);
    }
    return sum.divideScalar(width);
  });
}

export function domeGeometry(outline: readonly Vector2[], shape: DomeShape): BufferGeometry {
  const count = outline.length;
  const [cx, cy] = shape.centre;
  const positions = new Float32Array(count * (shape.rings + 1) * XYZ);
  for (let ring = 0; ring <= shape.rings; ring += 1) {
    const share = Math.sin((ring / shape.rings) * QUARTER);
    const radial = Math.pow(1 - Math.pow(share, shape.power), 1 / shape.power);
    const shaped = blurred(outline, Math.round(share * count * shape.rounding));
    shaped.forEach((point, index) => {
      const depth = lerp(shape.depthAt(point), shape.depth, share);
      const offset = (ring * count + index) * XYZ;
      positions[offset] = cx + (point.x - cx) * radial;
      positions[offset + 1] = cy + (point.y - cy) * radial;
      positions[offset + 2] = -shape.slab - (depth - shape.slab) * share;
    });
  }
  const indices: number[] = [];
  for (let ring = 0; ring < shape.rings; ring += 1) {
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      const a = ring * count + index;
      const b = ring * count + next;
      const c = (ring + 1) * count + index;
      const d = (ring + 1) * count + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
