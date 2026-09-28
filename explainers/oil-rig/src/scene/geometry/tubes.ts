import type { BufferGeometry } from 'three';
import { FULL_TURN } from '@core/math';
import { MeshBuilder } from './meshBuilder';
import type { Vec3 } from './meshBuilder';

export interface TubeArc {
  start: number;
  length: number;
}

export interface TubeFaces {
  outer: boolean;
  inner: boolean;
  caps: boolean;
  cuts: boolean;
}

export interface TubeSpec {
  outer: number;
  inner: number;
  bottom: number;
  top: number;
  segments: number;
  arc?: TubeArc;
  faces?: Partial<TubeFaces>;
}

const HALF_TURN = FULL_TURN / 2;

export const FULL_ARC: TubeArc = { start: 0, length: FULL_TURN };
export const BACK_HALF: TubeArc = { start: HALF_TURN, length: HALF_TURN };
export const FRONT_HALF: TubeArc = { start: 0, length: HALF_TURN };

const ALL_FACES: TubeFaces = { outer: true, inner: true, caps: true, cuts: true };
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];

interface Ring {
  cos: number;
  sin: number;
}

function rings(arc: TubeArc, segments: number): Ring[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = arc.start + (arc.length * index) / segments;
    return { cos: Math.cos(angle), sin: Math.sin(angle) };
  });
}

function at(ring: Ring, radius: number, y: number): Vec3 {
  return [radius * ring.cos, y, radius * ring.sin];
}

export interface TubeEdges {
  bottom: number[];
  top: number[];
}

function wall(
  builder: MeshBuilder,
  spec: TubeSpec,
  list: Ring[],
  radius: number,
  facing: 1 | -1,
  edges: TubeEdges,
) {
  const columns = list.map((ring) => {
    const normal: Vec3 = [facing * ring.cos, 0, facing * ring.sin];
    return [
      builder.vertex(at(ring, radius, spec.bottom), normal),
      builder.vertex(at(ring, radius, spec.top), normal),
    ];
  });
  columns.forEach(([bottom, top]) => {
    edges.bottom.push(bottom);
    edges.top.push(top);
  });
  for (let index = 0; index < columns.length - 1; index++) {
    const [a, b] = columns[index];
    const [c, d] = columns[index + 1];
    if (facing > 0) builder.quad(a, b, d, c);
    else builder.quad(a, c, d, b);
  }
}

function cap(builder: MeshBuilder, spec: TubeSpec, list: Ring[], y: number, normal: Vec3) {
  const upward = normal[1] > 0;
  const columns = list.map((ring) => [
    builder.vertex(at(ring, spec.outer, y), normal),
    builder.vertex(at(ring, spec.inner, y), normal),
  ]);
  for (let index = 0; index < columns.length - 1; index++) {
    const [outer, inner] = columns[index];
    const [nextOuter, nextInner] = columns[index + 1];
    if (upward) builder.quad(outer, inner, nextInner, nextOuter);
    else builder.quad(outer, nextOuter, nextInner, inner);
  }
}

function cut(builder: MeshBuilder, spec: TubeSpec, ring: Ring, side: 1 | -1) {
  const normal: Vec3 = [-side * ring.sin, 0, side * ring.cos];
  const innerBottom = builder.vertex(at(ring, spec.inner, spec.bottom), normal);
  const outerBottom = builder.vertex(at(ring, spec.outer, spec.bottom), normal);
  const outerTop = builder.vertex(at(ring, spec.outer, spec.top), normal);
  const innerTop = builder.vertex(at(ring, spec.inner, spec.top), normal);
  if (side > 0) builder.quad(innerBottom, outerBottom, outerTop, innerTop);
  else builder.quad(innerBottom, innerTop, outerTop, outerBottom);
}

export function addTube(builder: MeshBuilder, spec: TubeSpec): TubeEdges {
  const arc = spec.arc ?? FULL_ARC;
  const faces = { ...ALL_FACES, ...spec.faces };
  const list = rings(arc, spec.segments);
  const edges: TubeEdges = { bottom: [], top: [] };
  if (faces.outer) wall(builder, spec, list, spec.outer, 1, edges);
  if (faces.inner && spec.inner > 0) wall(builder, spec, list, spec.inner, -1, edges);
  if (faces.caps) {
    cap(builder, spec, list, spec.top, UP);
    cap(builder, spec, list, spec.bottom, DOWN);
  }
  if (faces.cuts && arc.length < FULL_TURN) {
    cut(builder, spec, list[0], -1);
    cut(builder, spec, list[list.length - 1], 1);
  }
  return edges;
}

export function tubeGeometry(spec: TubeSpec): BufferGeometry {
  const builder = new MeshBuilder();
  addTube(builder, spec);
  return builder.build();
}

export function grooveSpec(
  radius: number,
  bottom: number,
  top: number,
  segments: number,
): TubeSpec {
  return {
    outer: radius,
    inner: radius,
    bottom,
    top,
    segments,
    arc: BACK_HALF,
    faces: { outer: false, caps: false, cuts: false },
  };
}
