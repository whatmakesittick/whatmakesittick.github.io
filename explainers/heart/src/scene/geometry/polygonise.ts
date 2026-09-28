import { BufferAttribute, BufferGeometry, MeshBasicMaterial } from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Field, Vec3 } from './field';

export interface GridCube {
  readonly centre: Vec3;
  readonly halfSize: number;
  readonly resolution: number;
}

const STRIDES = [4, 2, 1] as const;
const BAND_CELLS = 1;
const MAX_TRIANGLES = 400_000;
const WELD_TOLERANCE = 1e-4;
const XYZ = 3;
const CORNERS = 3;

function gridCoordinate(cube: GridCube, axis: number, index: number): number {
  return cube.centre[axis] + cube.halfSize * (-1 + (2 * index) / cube.resolution);
}

interface Level {
  readonly stride: number;
  readonly size: number;
  readonly values: Float32Array;
}

function levelSize(cube: GridCube, stride: number): number {
  return Math.ceil((cube.resolution - 1) / stride) + 1;
}

function interpolate(level: Level, i: number, j: number, k: number): number {
  const { stride, size, values } = level;
  const fi = i / stride;
  const fj = j / stride;
  const fk = k / stride;
  const i0 = Math.min(Math.floor(fi), size - 2);
  const j0 = Math.min(Math.floor(fj), size - 2);
  const k0 = Math.min(Math.floor(fk), size - 2);
  const ti = fi - i0;
  const tj = fj - j0;
  const tk = fk - k0;
  const at = (a: number, b: number, c: number) => values[a + size * (b + size * c)];
  const x00 = at(i0, j0, k0) * (1 - ti) + at(i0 + 1, j0, k0) * ti;
  const x10 = at(i0, j0 + 1, k0) * (1 - ti) + at(i0 + 1, j0 + 1, k0) * ti;
  const x01 = at(i0, j0, k0 + 1) * (1 - ti) + at(i0 + 1, j0, k0 + 1) * ti;
  const x11 = at(i0, j0 + 1, k0 + 1) * (1 - ti) + at(i0 + 1, j0 + 1, k0 + 1) * ti;
  const y0 = x00 * (1 - tj) + x10 * tj;
  const y1 = x01 * (1 - tj) + x11 * tj;
  return y0 * (1 - tk) + y1 * tk;
}

function sampleLevel(field: Field, cube: GridCube, stride: number, coarser: Level | null): Level {
  const size = levelSize(cube, stride);
  const values = new Float32Array(size * size * size);
  const cell = (2 * cube.halfSize) / cube.resolution;
  const band = coarser ? BAND_CELLS * coarser.stride * cell * Math.sqrt(XYZ) : 0;
  const last = cube.resolution - 1;
  for (let k = 0; k < size; k += 1) {
    const gk = Math.min(k * stride, last);
    const z = gridCoordinate(cube, 2, gk);
    for (let j = 0; j < size; j += 1) {
      const gj = Math.min(j * stride, last);
      const y = gridCoordinate(cube, 1, gj);
      for (let i = 0; i < size; i += 1) {
        const gi = Math.min(i * stride, last);
        const estimate = coarser ? interpolate(coarser, gi, gj, gk) : 0;
        values[i + size * (j + size * k)] =
          coarser && Math.abs(estimate) > band
            ? estimate
            : field.distance(gridCoordinate(cube, 0, gi), y, z);
      }
    }
  }
  return { stride, size, values };
}

export function sampleField(field: Field, cube: GridCube, target: Float32Array): void {
  let level: Level | null = null;
  for (const stride of STRIDES) level = sampleLevel(field, cube, stride, level);
  const fine = level as Level;
  const { resolution } = cube;
  for (let index = 0; index < resolution * resolution * resolution; index += 1) {
    target[index] = -fine.values[index];
  }
}

function signedVolume(positions: ArrayLike<number>, index: ArrayLike<number>): number {
  let volume = 0;
  for (let t = 0; t < index.length; t += CORNERS) {
    const a = index[t] * XYZ;
    const b = index[t + 1] * XYZ;
    const c = index[t + 2] * XYZ;
    const cx = positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1];
    const cy = positions[b + 2] * positions[c] - positions[b] * positions[c + 2];
    const cz = positions[b] * positions[c + 1] - positions[b + 1] * positions[c];
    volume += positions[a] * cx + positions[a + 1] * cy + positions[a + 2] * cz;
  }
  return volume;
}

function withoutDegenerates(index: ArrayLike<number>): number[] {
  const kept: number[] = [];
  for (let t = 0; t < index.length; t += CORNERS) {
    const a = index[t];
    const b = index[t + 1];
    const c = index[t + 2];
    if (a !== b && b !== c && a !== c) kept.push(a, b, c);
  }
  return kept;
}

function outwardFacing(index: number[], positions: ArrayLike<number>): number[] {
  if (signedVolume(positions, index) >= 0) return index;
  const flipped = [...index];
  for (let t = 0; t < flipped.length; t += CORNERS) {
    [flipped[t + 1], flipped[t + 2]] = [flipped[t + 2], flipped[t + 1]];
  }
  return flipped;
}

function soup(cubes: MarchingCubes, cube: GridCube): BufferGeometry {
  const count = cubes.count;
  const positions = new Float32Array(count * XYZ);
  for (let vertex = 0; vertex < count; vertex += 1) {
    for (let axis = 0; axis < XYZ; axis += 1) {
      const offset = vertex * XYZ + axis;
      positions[offset] = cube.centre[axis] + cube.halfSize * cubes.positionArray[offset];
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  return geometry;
}

export function polygonise(field: Field, cube: GridCube): BufferGeometry {
  const material = new MeshBasicMaterial();
  const cubes = new MarchingCubes(cube.resolution, material, false, false, MAX_TRIANGLES);
  sampleField(field, cube, cubes.field);
  cubes.isolation = 0;
  cubes.update();
  const raw = soup(cubes, cube);
  cubes.geometry.dispose();
  material.dispose();
  const welded = mergeVertices(raw, WELD_TOLERANCE);
  raw.dispose();
  const positions = welded.getAttribute('position').array;
  const index = outwardFacing(withoutDegenerates(welded.getIndex()?.array ?? []), positions);
  welded.setIndex(index);
  return welded;
}
