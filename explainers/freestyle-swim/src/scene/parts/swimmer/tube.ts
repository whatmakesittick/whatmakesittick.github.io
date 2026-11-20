import { BufferAttribute, BufferGeometry } from 'three';
import { clampedCurve } from '../../rig/curve';

export type Station = readonly [at: number, halfWidth: number, positive: number, negative: number];

export interface TubeSpec {
  readonly stations: readonly Station[];
  readonly radial: number;
  readonly rings: number;
  readonly capStart?: number;
  readonly capEnd?: number;
  readonly capSteps?: number;
  readonly inflate?: number;
  readonly from?: number;
  readonly to?: number;
}

const XYZ = 3;
const QUARTER = Math.PI / 2;
const DEFAULT_CAP_STEPS = 4;
const WIDTH = 1;
const POSITIVE = 2;
const NEGATIVE = 3;

interface Ring {
  readonly at: number;
  readonly scale: number;
}

function channel(stations: readonly Station[], index: number): (at: number) => number {
  const keys = stations.map((station) => [station[0], station[index]] as const);
  return (at) => clampedCurve(keys, at);
}

function capRings(at: number, extent: number, steps: number, direction: number): Ring[] {
  if (extent <= 0) return [];
  return Array.from({ length: steps }, (_, step) => {
    const angle = (QUARTER * step) / steps;
    return { at: at + direction * extent * Math.cos(angle), scale: Math.sin(angle) };
  });
}

function bodyRings(from: number, to: number, count: number): Ring[] {
  return Array.from({ length: count + 1 }, (_, step) => ({
    at: from + ((to - from) * step) / count,
    scale: 1,
  }));
}

function ringList(spec: TubeSpec): Ring[] {
  const { stations, rings, capStart = 0, capEnd = 0, capSteps = DEFAULT_CAP_STEPS } = spec;
  const from = spec.from ?? stations[0][0];
  const to = spec.to ?? stations[stations.length - 1][0];
  return [
    ...capRings(from, capStart, capSteps, -1),
    ...bodyRings(from, to, rings),
    ...capRings(to, capEnd, capSteps, 1).reverse(),
  ];
}

export function closeSeam(normals: Float32Array, ringSize: number): void {
  const rings = normals.length / XYZ / ringSize;
  for (let ring = 0; ring < rings; ring++) {
    const first = ring * ringSize * XYZ;
    const last = first + (ringSize - 1) * XYZ;
    let length = 0;
    const sum = [0, 1, 2].map((axis) => normals[first + axis] + normals[last + axis]);
    length = Math.hypot(sum[0], sum[1], sum[2]) || 1;
    sum.forEach((value, axis) => {
      normals[first + axis] = value / length;
      normals[last + axis] = value / length;
    });
  }
}

export function gridIndex(ringSize: number, rings: number): number[] {
  const index: number[] = [];
  for (let ring = 0; ring < rings; ring++) {
    for (let step = 0; step < ringSize - 1; step++) {
      const a = ring * ringSize + step;
      const b = a + ringSize;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return index;
}

export function tubeGeometry(spec: TubeSpec): BufferGeometry {
  const { stations, radial, inflate = 0 } = spec;
  const [width, positive, negative] = [WIDTH, POSITIVE, NEGATIVE].map((index) =>
    channel(stations, index),
  );
  const rings = ringList(spec);
  const positions: number[] = [];
  rings.forEach(({ at, scale }) => {
    const [halfWidth, up, down] = [width(at), positive(at), negative(at)].map(
      (value) => (value + inflate) * scale,
    );
    for (let step = 0; step <= radial; step++) {
      const angle = (step / radial) * Math.PI * 2;
      const sin = Math.sin(angle);
      const depth = down + (up - down) * (0.5 + 0.5 * sin);
      positions.push(halfWidth * Math.cos(angle), at, depth * sin);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setIndex(gridIndex(radial + 1, rings.length - 1));
  geometry.computeVertexNormals();
  closeSeam(geometry.getAttribute('normal').array as Float32Array, radial + 1);
  return geometry;
}
