import { BufferGeometry, Color, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';

export type ProfilePoint = readonly [radius: number, y: number];

export type Strand = readonly ProfilePoint[];

export interface Arc {
  start: number;
  length: number;
}

export type Tint = (radius: number, y: number, target: Color) => void;

export interface RevolveOptions {
  segments: number;
  arc?: Arc;
  vRange?: readonly [bottom: number, top: number];
  tint?: Tint;
}

export const WHOLE_ARC: Arc = { start: 0, length: FULL_TURN };
export const BACK_HALF_ARC: Arc = { start: Math.PI / 2, length: Math.PI };

const MIN_TANGENT = 1e-9;
const SAME_POINT = 1e-6;
const XYZ = 3;

function meridianNormal(strand: Strand, index: number): readonly [number, number] {
  const before = strand[Math.max(0, index - 1)];
  const after = strand[Math.min(strand.length - 1, index + 1)];
  const dr = after[0] - before[0];
  const dy = after[1] - before[1];
  const length = Math.hypot(dr, dy);
  if (length < MIN_TANGENT) return [1, 0];
  return [-dy / length, dr / length];
}

function strandRange(strand: Strand): readonly [number, number] {
  const heights = strand.map((point) => point[1]);
  return [Math.min(...heights), Math.max(...heights)];
}

export function revolveStrand(strand: Strand, options: RevolveOptions): BufferGeometry {
  const arc = options.arc ?? WHOLE_ARC;
  const segments = Math.max(1, Math.round((options.segments * arc.length) / FULL_TURN));
  const [bottom, top] = options.vRange ?? strandRange(strand);
  const span = top - bottom || 1;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const color = new Color();
  strand.forEach(([radius, y], index) => {
    const [nr, ny] = meridianNormal(strand, index);
    if (options.tint) options.tint(radius, y, color);
    for (let step = 0; step <= segments; step += 1) {
      const phi = arc.start + (arc.length * step) / segments;
      const sin = Math.sin(phi);
      const cos = Math.cos(phi);
      positions.push(radius * sin, y, radius * cos);
      normals.push(nr * sin, ny, nr * cos);
      uvs.push(phi / FULL_TURN, (y - bottom) / span);
      if (options.tint) colors.push(color.r, color.g, color.b);
    }
  });
  const indices: number[] = [];
  const row = segments + 1;
  for (let index = 0; index < strand.length - 1; index += 1) {
    for (let step = 0; step < segments; step += 1) {
      const a = index * row + step;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  if (options.tint) geometry.setAttribute('color', new Float32BufferAttribute(colors, XYZ));
  geometry.setIndex(indices);
  return geometry;
}

export function outlineOf(strands: readonly Strand[]): ProfilePoint[] {
  const outline: ProfilePoint[] = [];
  for (const point of strands.flat()) {
    const last = outline[outline.length - 1];
    if (!last || Math.hypot(last[0] - point[0], last[1] - point[1]) > SAME_POINT) {
      outline.push(point);
    }
  }
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (outline.length > 1 && Math.hypot(first[0] - last[0], first[1] - last[1]) <= SAME_POINT) {
    outline.pop();
  }
  return outline;
}

export function signedArea(points: readonly ProfilePoint[], [a, b, c]: readonly number[]): number {
  const [ax, ay] = points[a];
  const [bx, by] = points[b];
  const [cx, cy] = points[c];
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function toVectors(points: readonly ProfilePoint[]): Vector2[] {
  return points.map(([radius, y]) => new Vector2(radius, y));
}

export function profileCap(
  outline: readonly ProfilePoint[],
  holes: readonly (readonly ProfilePoint[])[] = [],
): BufferGeometry {
  const contour = toVectors(outline);
  const faces = ShapeUtils.triangulateShape(contour, holes.map(toVectors));
  const all = [...outline, ...holes.flat()];
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const side of [1, -1]) {
    for (const [radius, y] of all) {
      positions.push(side * radius, y, 0);
      normals.push(0, 0, 1);
      uvs.push(radius, y);
    }
  }
  const indices: number[] = [];
  const count = all.length;
  for (const face of faces) {
    const [a, b, c] = signedArea(all, face) > 0 ? face : [face[0], face[2], face[1]];
    indices.push(a, b, c, count + a, count + c, count + b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function revolveStrands(
  strands: readonly Strand[],
  options: RevolveOptions,
): BufferGeometry {
  const parts = strands.map((strand) => revolveStrand(strand, options));
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge revolved strands');
  return merged;
}

export interface ShellSegment {
  strand: Strand;
  inner?: boolean;
}

export interface ShellSpec {
  outline: readonly ShellSegment[];
  holes?: readonly (readonly ShellSegment[])[];
}

export interface RevolvedShell {
  whole: BufferGeometry;
  half: BufferGeometry;
  cavity: BufferGeometry | null;
  cap: BufferGeometry;
}

function strandsOf(segments: readonly ShellSegment[], inner: boolean): Strand[] {
  return segments.filter((segment) => Boolean(segment.inner) === inner).map((s) => s.strand);
}

export function revolveShell(spec: ShellSpec, options: Omit<RevolveOptions, 'arc'>): RevolvedShell {
  const segments = [...spec.outline, ...(spec.holes ?? []).flat()];
  const outer = strandsOf(segments, false);
  const inner = strandsOf(segments, true);
  return {
    whole: revolveStrands(outer, { ...options, arc: WHOLE_ARC }),
    half: revolveStrands(outer, { ...options, arc: BACK_HALF_ARC }),
    cavity: inner.length > 0 ? revolveStrands(inner, { ...options, arc: BACK_HALF_ARC }) : null,
    cap: profileCap(
      outlineOf(spec.outline.map((segment) => segment.strand)),
      (spec.holes ?? []).map((hole) => outlineOf(hole.map((segment) => segment.strand))),
    ),
  };
}
