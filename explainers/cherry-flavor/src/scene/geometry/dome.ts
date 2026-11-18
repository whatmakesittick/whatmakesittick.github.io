import { BufferAttribute, BufferGeometry, Vector2 } from 'three';
import { FULL_TURN, clamp, lerp, smoothstep } from '@core/math';
import type { Point } from '../../ids';

export interface DomeShape {
  readonly centre: Point;
  readonly slab: number;
  readonly depth: number;
  readonly rings: number;
  readonly power: number;
  readonly rounding: number;
  readonly segments: number;
  depthAt(point: Vector2): number;
}

const XYZ = 3;
const QUARTER = Math.PI / 2;
const NORMAL_PASSES = 6;
const DEPTH_BLEND = 0.45;

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

function unwrapped(angles: number[]): number[] {
  const out = [angles[0]];
  for (let index = 1; index < angles.length; index += 1) {
    let angle = angles[index];
    while (angle - out[index - 1] > Math.PI) angle -= FULL_TURN;
    while (angle - out[index - 1] < -Math.PI) angle += FULL_TURN;
    out.push(angle);
  }
  return out;
}

export function byAngle(outline: readonly Vector2[], centre: Point, count: number): Vector2[] {
  const [cx, cy] = centre;
  const angles = unwrapped(outline.map((point) => Math.atan2(point.y - cy, point.x - cx)));
  const closed = [...outline, outline[0]];
  const closedAngles = [...angles, angles[0] + FULL_TURN];
  const start = closedAngles[0];
  let segment = 0;
  return Array.from({ length: count }, (_, index) => {
    const angle = start + (index / count) * FULL_TURN;
    while (segment < closed.length - 2 && closedAngles[segment + 1] < angle) segment += 1;
    const from = closedAngles[segment];
    const to = closedAngles[segment + 1];
    const share = to > from ? (angle - from) / (to - from) : 0;
    return closed[segment].clone().lerp(closed[segment + 1], clamp(share, 0, 1));
  });
}

export function domeGeometry(source: readonly Vector2[], shape: DomeShape): BufferGeometry {
  const outline = byAngle(source, shape.centre, shape.segments);
  const count = outline.length;
  const [cx, cy] = shape.centre;
  const positions = new Float32Array(count * (shape.rings + 1) * XYZ);
  for (let ring = 0; ring <= shape.rings; ring += 1) {
    const share = Math.sin((ring / shape.rings) * QUARTER);
    const radial = Math.pow(1 - Math.pow(share, shape.power), 1 / shape.power);
    const shaped = blurred(outline, Math.round(Math.sqrt(share) * count * shape.rounding));
    shaped.forEach((point, index) => {
      const depth = lerp(shape.depthAt(point), shape.depth, smoothstep(share, 0, DEPTH_BLEND));
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
  smoothNormals(geometry.getAttribute('normal') as BufferAttribute, count, shape.rings);
  return geometry;
}

function smoothNormals(normals: BufferAttribute, count: number, rings: number): void {
  const source = normals.array as Float32Array;
  for (let pass = 0; pass < NORMAL_PASSES; pass += 1) {
    const copy = source.slice();
    for (let ring = 1; ring < rings; ring += 1) {
      for (let index = 0; index < count; index += 1) {
        const at = (ring * count + index) * XYZ;
        const neighbours = [
          (ring * count + ((index + 1) % count)) * XYZ,
          (ring * count + ((index - 1 + count) % count)) * XYZ,
          ((ring - 1) * count + index) * XYZ,
          ((ring + 1) * count + index) * XYZ,
        ];
        for (let axis = 0; axis < XYZ; axis += 1) {
          const around = neighbours.reduce((sum, other) => sum + copy[other + axis], 0);
          source[at + axis] = (copy[at + axis] * 2 + around) / (2 + neighbours.length);
        }
        const length = Math.hypot(source[at], source[at + 1], source[at + 2]) || 1;
        for (let axis = 0; axis < XYZ; axis += 1) source[at + axis] /= length;
      }
    }
  }
  normals.needsUpdate = true;
}
