import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Uv } from './swatch';

export type SectionPoint = readonly [z: number, y: number];

export interface LoftSpec {
  stations: readonly number[];
  ring(x: number): readonly SectionPoint[];
  uvAt(x: number, band: number): Uv;
}

const XYZ = 3;
const UV = 2;
const QUAD_VERTICES = 6;

function fullRing(half: readonly SectionPoint[]): SectionPoint[] {
  const left = half
    .slice(1)
    .reverse()
    .map(([z, y]): SectionPoint => [-z, y]);
  return [...left, ...half];
}

function halfBand(full: number, halfCount: number): number {
  const centre = halfCount - 1;
  return full < centre ? centre - 1 - full : full - centre;
}

export function loft(spec: LoftSpec): BufferGeometry {
  const { stations } = spec;
  const halves = stations.map((x) => spec.ring(x));
  const halfCount = halves[0].length;
  const rings = halves.map(fullRing);
  const width = rings[0].length;
  const positions = rings.flatMap((ring, station) =>
    ring.flatMap(([z, y]) => [stations[station], y, z]),
  );
  const index: number[] = [];
  const uvs: number[] = [];
  for (let station = 0; station < stations.length - 1; station += 1) {
    const midX = (stations[station] + stations[station + 1]) / 2;
    for (let around = 0; around < width - 1; around += 1) {
      const a = station * width + around;
      const b = a + width;
      index.push(a, a + 1, b + 1, a, b + 1, b);
      const uv = spec.uvAt(midX, halfBand(around, halfCount));
      for (let vertex = 0; vertex < QUAD_VERTICES; vertex += 1) uvs.push(...uv);
    }
  }
  const grid = new BufferGeometry();
  grid.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  grid.setIndex(index);
  grid.computeVertexNormals();
  const geometry = grid.toNonIndexed();
  grid.dispose();
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, UV));
  return geometry;
}
