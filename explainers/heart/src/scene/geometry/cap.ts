import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from 'three';

export type Loop = readonly Vector2[];

export interface CapStyle {
  readonly bandMm: number;
  readonly bandShare: number;
}

export interface CapGeometry {
  readonly geometry: BufferGeometry;
  readonly edge: Uint8Array;
}

export const CAP_EDGE = { outer: 0, cavity: 1, band: 2 } as const;

const XYZ = 3;
const CORNERS = 3;

export function signedArea(loop: Loop): number {
  let area = 0;
  loop.forEach((point, index) => {
    const next = loop[(index + 1) % loop.length];
    area += point.x * next.y - next.x * point.y;
  });
  return area / 2;
}

export function counterClockwise(loop: Loop): Vector2[] {
  return signedArea(loop) >= 0 ? [...loop] : [...loop].reverse();
}

export function containsPoint(loop: Loop, point: Vector2): boolean {
  let inside = false;
  for (let index = 0, previous = loop.length - 1; index < loop.length; previous = index++) {
    const a = loop[index];
    const b = loop[previous];
    const crosses = a.y > point.y !== b.y > point.y;
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function nearestOther(point: Vector2, others: readonly Loop[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const loop of others) {
    for (const other of loop) nearest = Math.min(nearest, point.distanceTo(other));
  }
  return nearest;
}

export function bandLoop(hole: Loop, others: readonly Loop[], style: CapStyle): Vector2[] {
  const loop = counterClockwise(hole);
  return loop.map((point, index) => {
    const before = loop[(index - 1 + loop.length) % loop.length];
    const after = loop[(index + 1) % loop.length];
    const tangent = after.clone().sub(before);
    const outward = new Vector2(tangent.y, -tangent.x).normalize();
    const reach = Math.min(style.bandMm, nearestOther(point, others) * style.bandShare);
    return point.clone().addScaledVector(outward, reach);
  });
}

interface Builder {
  positions: number[];
  edge: number[];
  index: number[];
}

function addLoop(builder: Builder, loop: Loop, edge: number): number {
  const start = builder.edge.length;
  loop.forEach((point) => {
    builder.positions.push(point.x, point.y, 0);
    builder.edge.push(edge);
  });
  return start;
}

function addFace(builder: Builder, a: number, b: number, c: number): void {
  const p = builder.positions;
  const cross =
    (p[b * XYZ] - p[a * XYZ]) * (p[c * XYZ + 1] - p[a * XYZ + 1]) -
    (p[b * XYZ + 1] - p[a * XYZ + 1]) * (p[c * XYZ] - p[a * XYZ]);
  if (cross >= 0) builder.index.push(a, b, c);
  else builder.index.push(a, c, b);
}

function addBand(builder: Builder, inner: Loop, outer: Loop): void {
  const innerStart = addLoop(builder, inner, CAP_EDGE.cavity);
  const outerStart = addLoop(builder, outer, CAP_EDGE.band);
  const count = inner.length;
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    addFace(builder, innerStart + index, innerStart + next, outerStart + next);
    addFace(builder, innerStart + index, outerStart + next, outerStart + index);
  }
}

function addFilled(builder: Builder, contour: Loop, holes: readonly Loop[]): void {
  const start = addLoop(builder, contour, CAP_EDGE.outer);
  holes.forEach((hole) => addLoop(builder, hole, CAP_EDGE.band));
  const faces = ShapeUtils.triangulateShape(
    [...contour],
    holes.map((hole) => [...hole]),
  );
  faces.forEach(([a, b, c]) => addFace(builder, start + a, start + b, start + c));
}

export function capGeometry(
  outers: readonly Loop[],
  holes: readonly Loop[],
  style: CapStyle,
): CapGeometry {
  const builder: Builder = { positions: [], edge: [], index: [] };
  const everything = [...outers, ...holes];
  const bands = holes.map((hole) =>
    bandLoop(
      hole,
      everything.filter((loop) => loop !== hole),
      style,
    ),
  );
  holes.forEach((hole, index) => addBand(builder, counterClockwise(hole), bands[index]));
  for (const outer of outers) {
    const inside = bands.filter((band) => containsPoint(outer, band[0]));
    addFilled(builder, counterClockwise(outer), inside);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(builder.positions), XYZ));
  const normals = new Float32Array(builder.positions.length);
  for (let offset = 2; offset < normals.length; offset += XYZ) normals[offset] = 1;
  geometry.setAttribute('normal', new BufferAttribute(normals, XYZ));
  geometry.setIndex(builder.index);
  return { geometry, edge: new Uint8Array(builder.edge) };
}

export function triangleCount(geometry: BufferGeometry): number {
  return (geometry.getIndex()?.count ?? 0) / CORNERS;
}
