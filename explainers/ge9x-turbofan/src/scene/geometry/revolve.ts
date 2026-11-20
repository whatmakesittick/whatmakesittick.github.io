import { BufferGeometry, Float32BufferAttribute, SplineCurve, Vector2 } from 'three';
import { FULL_TURN } from '@core/math';

export type ProfilePoint = readonly [x: number, radius: number];

export type Strand = readonly ProfilePoint[];

export interface Arc {
  start: number;
  length: number;
}

export const WHOLE_ARC: Arc = { start: 0, length: FULL_TURN };

const MIN_TANGENT = 1e-9;
const XYZ = 3;

export function smooth(points: readonly ProfilePoint[], samples: number): Strand {
  const curve = new SplineCurve(points.map(([x, radius]) => new Vector2(x, radius)));
  return curve.getPoints(samples).map((point) => [point.x, point.y] as const);
}

export function line(from: ProfilePoint, to: ProfilePoint): Strand {
  return [from, to];
}

function strandNormal(strand: Strand, index: number): readonly [number, number] {
  const before = strand[Math.max(0, index - 1)];
  const after = strand[Math.min(strand.length - 1, index + 1)];
  const dx = after[0] - before[0];
  const dr = after[1] - before[1];
  const length = Math.hypot(dx, dr);
  if (length < MIN_TANGENT) return [0, 1];
  return [-dr / length, dx / length];
}

interface Buffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

function appendStrand(buffers: Buffers, strand: Strand, segments: number, arc: Arc): void {
  const base = buffers.positions.length / XYZ;
  let travelled = 0;
  strand.forEach(([x, radius], index) => {
    if (index > 0) {
      const [px, pr] = strand[index - 1];
      travelled += Math.hypot(x - px, radius - pr);
    }
    const [nx, nr] = strandNormal(strand, index);
    for (let step = 0; step <= segments; step += 1) {
      const angle = arc.start + (arc.length * step) / segments;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      buffers.positions.push(x, radius * cos, radius * sin);
      buffers.normals.push(nx, nr * cos, nr * sin);
      buffers.uvs.push(angle / FULL_TURN, travelled);
    }
  });
  const row = segments + 1;
  for (let index = 0; index < strand.length - 1; index += 1) {
    for (let step = 0; step < segments; step += 1) {
      const a = base + index * row + step;
      const b = a + row;
      buffers.indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
}

export function revolve(
  strands: readonly Strand[],
  segments: number,
  arc = WHOLE_ARC,
): BufferGeometry {
  const buffers: Buffers = { positions: [], normals: [], uvs: [], indices: [] };
  const steps = Math.max(1, Math.round((segments * arc.length) / FULL_TURN));
  strands.forEach((strand) => appendStrand(buffers, strand, steps, arc));
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(buffers.positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(buffers.normals, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(buffers.uvs, 2));
  geometry.setIndex(buffers.indices);
  return geometry;
}

export function closedLoop(corners: readonly ProfilePoint[]): Strand[] {
  return corners.map((point, index) => line(point, corners[(index + 1) % corners.length]));
}

export function ring(
  from: number,
  to: number,
  inner: number,
  outer: number,
  segments: number,
): BufferGeometry {
  return revolve(
    closedLoop([
      [from, outer],
      [to, outer],
      [to, inner],
      [from, inner],
    ]),
    segments,
  );
}
