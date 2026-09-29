import { BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';
import type { ChamberId, ValveId } from '../../ids';
import { VALVES } from '../../model';
import type { Contraction } from './contraction';
import type { Field } from './field';
import { cubeAround } from './grid';
import type { Bounds } from './grid';
import type { HeartSide } from './heartShape';
import { SIDE_CHAMBERS } from './heartShape';
import { addMorphTargets } from './morph';
import { FRONTAL_PLANE, insertPlane, sideFilter, subsetGeometry } from './planeCut';
import { trimAtPortals } from './portal';
import type { Portal } from './vesselPath';
import type { CutPlane } from './planeCut';
import { polygonise } from './polygonise';
import { taubinSmooth } from './smooth';

export interface SurfaceDetail {
  readonly resolution: number;
  readonly marginMm: number;
}

export interface EnvelopeHalves {
  readonly front: BufferGeometry;
  readonly back: BufferGeometry;
}

const XYZ = 3;
const CORNERS = 3;
const SIDE_VALVE: Readonly<Record<HeartSide, ValveId>> = { right: 'tricuspid', left: 'mitral' };

export function surface(
  field: Field,
  bounds: Bounds,
  detail: SurfaceDetail,
  portals: readonly Portal[],
): BufferGeometry {
  const geometry = polygonise(field, cubeAround(bounds, detail.marginMm, detail.resolution));
  taubinSmooth(geometry);
  return trimAtPortals(geometry, portals);
}

export type Painter = (
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
) => readonly [number, number, number];

export function envelopeHalves(
  field: Field,
  bounds: Bounds,
  detail: SurfaceDetail,
  motion: Contraction,
  painter: Painter,
  portals: readonly Portal[],
): EnvelopeHalves {
  const raw = surface(field, bounds, detail, portals);
  const cut = insertPlane(raw, FRONTAL_PLANE);
  raw.dispose();
  cut.computeVertexNormals();
  paint(cut, painter);
  addMorphTargets(cut, [motion.squeeze, motion.emptying]);
  const back = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false));
  const front = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, true));
  cut.dispose();
  return { front, back };
}

export function valvePlane(valve: ValveId): CutPlane {
  const { centre, normal } = VALVES[valve];
  const size = Math.hypot(...normal);
  const unit: [number, number, number] = [normal[0] / size, normal[1] / size, normal[2] / size];
  return {
    normal: unit,
    constant: -(unit[0] * centre[0] + unit[1] * centre[1] + unit[2] * centre[2]),
  };
}

function flipWinding(geometry: BufferGeometry): void {
  const index = geometry.getIndex();
  if (!index) return;
  const array = index.array;
  for (let t = 0; t < array.length; t += CORNERS) {
    const swap = array[t + 1];
    array[t + 1] = array[t + 2];
    array[t + 2] = swap;
  }
  index.needsUpdate = true;
}

function centroid(
  positions: ArrayLike<number>,
  corners: readonly number[],
): [number, number, number] {
  const sum: [number, number, number] = [0, 0, 0];
  for (const vertex of corners) {
    for (let axis = 0; axis < XYZ; axis += 1) sum[axis] += positions[vertex * XYZ + axis] / CORNERS;
  }
  return sum;
}

export function cavityPieces(
  side: HeartSide,
  field: Field,
  chambers: Readonly<Record<ChamberId, Field>>,
  bounds: Bounds,
  detail: SurfaceDetail,
  motion: Contraction,
  portals: readonly Portal[],
): Map<ChamberId, BufferGeometry> {
  const raw = surface(field, bounds, detail, portals);
  const cut = insertPlane(raw, FRONTAL_PLANE);
  raw.dispose();
  const back = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false));
  cut.dispose();
  const plane = valvePlane(SIDE_VALVE[side]);
  const split = insertPlane(back, plane);
  back.dispose();
  flipWinding(split);
  split.computeVertexNormals();
  addMorphTargets(split, [motion.squeeze, motion.emptying]);
  const [atrium, ventricle] = SIDE_CHAMBERS[side];
  const downstream = sideFilter(split, plane, true);
  const positions = split.getAttribute('position').array;
  const inVentricle = (corners: readonly number[], triangle: number) => {
    if (downstream(corners, triangle)) return true;
    const [x, y, z] = centroid(positions, corners);
    return chambers[ventricle].distance(x, y, z) < chambers[atrium].distance(x, y, z);
  };
  const pieces = new Map<ChamberId, BufferGeometry>([
    [atrium, subsetGeometry(split, (corners, triangle) => !inVentricle(corners, triangle))],
    [ventricle, subsetGeometry(split, inVentricle)],
  ]);
  split.dispose();
  return pieces;
}

export function paint(geometry: BufferGeometry, colour: Painter): void {
  const positions = geometry.getAttribute('position').array;
  const normals = geometry.getAttribute('normal').array;
  const colours = new Float32Array(positions.length);
  for (let offset = 0; offset < positions.length; offset += XYZ) {
    const [r, g, b] = colour(
      positions[offset],
      positions[offset + 1],
      positions[offset + 2],
      normals[offset],
      normals[offset + 1],
      normals[offset + 2],
    );
    colours[offset] = r;
    colours[offset + 1] = g;
    colours[offset + 2] = b;
  }
  geometry.setAttribute('color', new BufferAttribute(colours, XYZ));
}
