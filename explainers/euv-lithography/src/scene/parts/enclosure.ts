import type { BufferGeometry } from 'three';
import type { Point } from '../../ids';
import { BOLT_M, SEAM_M, SKIN_M } from './optics/dims';
import { rod, slab, studs } from './optics/geo';
import type { Axis, Bin, Cell } from './optics/geo';

export type Range = readonly [number, number];

export interface Face {
  readonly axis: Axis;
  readonly side: 1 | -1;
  readonly plane: number;
}

export interface Opening {
  readonly u: Range;
  readonly v: Range;
}

export const MAX_TILE_M = 0.62;
export const LINER_M = 0.01;
export const FRAME_M = 0.045;
export const FRAME_PROUD_M = 0.022;
export const BOLT_PITCH_M = 0.2;
export const DOOR = {
  gap: 0.012,
  proud: 0.014,
  handle: 0.012,
  standoff: 0.05,
  reach: 0.4,
} as const;
export const VENT = { pitch: 0.035, slat: 0.012, proud: 0.016 } as const;

const PANEL_BEVEL_M = 0.006;
const GLASS_M = 0.008;
const HINGE = { radius: 0.014, length: 0.09, inset: 0.15 } as const;
const PLATE = { width: 0.12, tall: 0.05, drop: 0.08 } as const;
const AXES: Record<Axis, readonly [number, number, number]> = {
  z: [0, 1, 2],
  x: [2, 1, 0],
  y: [0, 2, 1],
};

function cell(face: Face, u: number, v: number, w: number): Cell {
  const [iu, iv, iw] = AXES[face.axis];
  const point: Cell = [0, 0, 0];
  point[iu] = u;
  point[iv] = v;
  point[iw] = w;
  return point;
}

export function depth(face: Face, from: number, to: number): Range {
  const a = face.plane + face.side * from;
  const b = face.plane + face.side * to;
  return a < b ? [a, b] : [b, a];
}

export function onFace(face: Face, u: Range, v: Range, w: Range, radius = 0): BufferGeometry {
  return slab(cell(face, u[0], v[0], w[0]), cell(face, u[1], v[1], w[1]), radius);
}

export function facePoint(face: Face, u: number, v: number, out: number): Point {
  return cell(face, u, v, face.plane + face.side * out);
}

export function faceOf(min: Point, max: Point, axis: Axis, side: 1 | -1): Face {
  const index = AXES[axis][2];
  return { axis, side, plane: side > 0 ? max[index] : min[index] };
}

export function spanOf(min: Point, max: Point, face: Face): Opening {
  const [iu, iv] = AXES[face.axis];
  return { u: [min[iu], max[iu]], v: [min[iv], max[iv]] };
}

function cuts(range: Range, edges: readonly number[], maxTile: number): number[] {
  const inside = edges.filter((edge) => edge > range[0] && edge < range[1]);
  const sorted = [...new Set([range[0], range[1], ...inside])].sort((a, b) => a - b);
  return sorted.flatMap((edge, index) => {
    if (index === sorted.length - 1) return [edge];
    const span = sorted[index + 1] - edge;
    const count = Math.max(1, Math.round(span / maxTile));
    return Array.from({ length: count }, (_, step) => edge + (span * step) / count);
  });
}

function within(opening: Opening, u: number, v: number): boolean {
  return u > opening.u[0] && u < opening.u[1] && v > opening.v[0] && v < opening.v[1];
}

export function addSkin(
  bin: Bin,
  face: Face,
  span: Opening,
  openings: readonly Opening[] = [],
  maxTile = MAX_TILE_M,
): void {
  const us = cuts(
    span.u,
    openings.flatMap((opening) => opening.u),
    maxTile,
  );
  const vs = cuts(
    span.v,
    openings.flatMap((opening) => opening.v),
    maxTile,
  );
  const w = depth(face, -SKIN_M, 0);
  const half = SEAM_M / 2;
  us.slice(0, -1).forEach((u0, i) =>
    vs.slice(0, -1).forEach((v0, j) => {
      const [u1, v1] = [us[i + 1], vs[j + 1]];
      if (openings.some((opening) => within(opening, (u0 + u1) / 2, (v0 + v1) / 2))) return;
      bin.add('panel', onFace(face, [u0 + half, u1 - half], [v0 + half, v1 - half], w));
    }),
  );
}

export function addLiner(bin: Bin, face: Face, span: Opening): void {
  bin.add('interior', onFace(face, span.u, span.v, depth(face, -SKIN_M - LINER_M, -SKIN_M)));
}

export function addPosts(bin: Bin, min: Point, max: Point, size: number): void {
  const half = size / 2;
  ([0, 1, 2] as const).forEach((along) => {
    const [b, c] = ([0, 1, 2] as const).filter((index) => index !== along);
    [min[b], max[b]].forEach((first) =>
      [min[c], max[c]].forEach((second) => {
        const lo: Cell = [0, 0, 0];
        const hi: Cell = [0, 0, 0];
        lo[along] = min[along] - half;
        hi[along] = max[along] + half;
        lo[b] = first - half;
        hi[b] = first + half;
        lo[c] = second - half;
        hi[c] = second + half;
        bin.add('machined', slab(lo, hi, PANEL_BEVEL_M));
      }),
    );
  });
}

function along(from: number, to: number, pitch: number): number[] {
  const count = Math.max(1, Math.round((to - from) / pitch));
  return Array.from({ length: count + 1 }, (_, step) => from + ((to - from) * step) / count);
}

export function studRow(
  bin: Bin,
  face: Face,
  start: readonly [number, number],
  end: readonly [number, number],
  out: number,
  pitch = BOLT_PITCH_M,
): void {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const points = along(0, length, pitch).map((distance) => {
    const share = length > 0 ? distance / length : 0;
    return facePoint(
      face,
      start[0] + (end[0] - start[0]) * share,
      start[1] + (end[1] - start[1]) * share,
      out,
    );
  });
  studs(bin, face.axis, points, BOLT_M);
}

function ring(bin: Bin, face: Face, opening: Opening, width: number, w: Range): void {
  const { u, v } = opening;
  bin.add(
    'machined',
    onFace(face, [u[0] - width, u[1] + width], [v[0] - width, v[0]], w, PANEL_BEVEL_M),
    onFace(face, [u[0] - width, u[1] + width], [v[1], v[1] + width], w, PANEL_BEVEL_M),
    onFace(face, [u[0] - width, u[0]], v, w, PANEL_BEVEL_M),
    onFace(face, [u[1], u[1] + width], v, w, PANEL_BEVEL_M),
  );
}

export function addWindow(bin: Bin, face: Face, opening: Opening, glass = bin): void {
  const { u, v } = opening;
  ring(bin, face, opening, FRAME_M, depth(face, -SKIN_M, FRAME_PROUD_M));
  glass.add('window', onFace(face, u, v, depth(face, -SKIN_M / 2 - GLASS_M, -SKIN_M / 2)));
  const mid = FRAME_M / 2;
  const corners: [number, number][] = [
    [u[0] - mid, v[0] - mid],
    [u[1] + mid, v[0] - mid],
    [u[1] + mid, v[1] + mid],
    [u[0] - mid, v[1] + mid],
  ];
  corners.forEach((corner, index) =>
    studRow(bin, face, corner, corners[(index + 1) % corners.length], FRAME_PROUD_M),
  );
}

export function addDoor(bin: Bin, face: Face, opening: Opening, hingeLow = true): void {
  const { u, v } = opening;
  bin.add('machined', onFace(face, u, v, depth(face, -SKIN_M, 0)));
  const leafU: Range = [u[0] + DOOR.gap, u[1] - DOOR.gap];
  const leafV: Range = [v[0] + DOOR.gap, v[1] - DOOR.gap];
  bin.add('panel', onFace(face, leafU, leafV, depth(face, -SKIN_M / 2, DOOR.proud), PANEL_BEVEL_M));
  const handleU = hingeLow ? leafU[1] - DOOR.standoff * 1.5 : leafU[0] + DOOR.standoff * 1.5;
  const midV = (v[0] + v[1]) / 2;
  const reach = Math.min(DOOR.reach, (v[1] - v[0]) * 0.4) / 2;
  const grip = DOOR.proud + DOOR.standoff;
  bin.add(
    'flange',
    rod(
      facePoint(face, handleU, midV - reach, grip),
      facePoint(face, handleU, midV + reach, grip),
      DOOR.handle,
    ),
    ...[-reach, reach].map((offset) =>
      rod(
        facePoint(face, handleU, midV + offset * 0.8, DOOR.proud),
        facePoint(face, handleU, midV + offset * 0.8, grip),
        DOOR.handle * 0.7,
      ),
    ),
  );
  const hingeU = hingeLow ? u[0] + DOOR.gap : u[1] - DOOR.gap;
  [v[0] + HINGE.inset, v[1] - HINGE.inset].forEach((hingeV) =>
    bin.add(
      'frame',
      rod(
        facePoint(face, hingeU, hingeV - HINGE.length / 2, DOOR.proud),
        facePoint(face, hingeU, hingeV + HINGE.length / 2, DOOR.proud),
        HINGE.radius,
      ),
    ),
  );
  const plateU = (leafU[0] + leafU[1]) / 2;
  bin.add(
    'accent',
    onFace(
      face,
      [plateU - PLATE.width / 2, plateU + PLATE.width / 2],
      [leafV[1] - PLATE.drop - PLATE.tall, leafV[1] - PLATE.drop],
      depth(face, DOOR.proud, DOOR.proud + 0.003),
    ),
  );
}

export function addVent(bin: Bin, face: Face, opening: Opening): void {
  const { u, v } = opening;
  bin.add('interior', onFace(face, u, v, depth(face, -SKIN_M, 0)));
  ring(bin, face, opening, FRAME_M / 2, depth(face, -SKIN_M, VENT.proud));
  along(v[0] + VENT.pitch / 2, v[1] - VENT.pitch / 2, VENT.pitch).forEach((slatV) =>
    bin.add(
      'frame',
      onFace(
        face,
        u,
        [slatV - VENT.slat / 2, slatV + VENT.slat / 2],
        depth(face, -SKIN_M / 2, VENT.proud / 2),
      ),
    ),
  );
}
