import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { PlanPoint } from '@core/scene/geometry/extrude';

export type Interval = readonly [start: number, end: number];
export type Ring = readonly PlanPoint[];
export type Height = number | ((z: number) => number);

export interface PlanLine {
  readonly origin: PlanPoint;
  readonly direction: PlanPoint;
}

export interface Slab {
  readonly intervals: readonly Interval[];
  readonly bottom: Height;
  readonly top: Height;
}

const CUT_DIRECTION: PlanPoint = { x: 0, z: 1 };
const SAMPLE_STEP = 0.02;
const XYZ = 3;
const FACING_CUT: readonly number[] = [-1, 0, 0];

function unit(direction: PlanPoint): PlanPoint {
  const length = Math.hypot(direction.x, direction.z) || 1;
  return { x: direction.x / length, z: direction.z / length };
}

function ringCrossings(ring: Ring, origin: PlanPoint, direction: PlanPoint): number[] {
  const across = (point: PlanPoint) =>
    (point.x - origin.x) * direction.z - (point.z - origin.z) * direction.x;
  const along = (point: PlanPoint) =>
    (point.x - origin.x) * direction.x + (point.z - origin.z) * direction.z;
  const found: number[] = [];
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const from = across(point);
    const to = across(next);
    if (from > 0 === to > 0) return;
    const share = from / (from - to);
    found.push(along(point) + (along(next) - along(point)) * share);
  });
  return found;
}

export function lineCrossings(rings: readonly Ring[], line: PlanLine): Interval[] {
  const direction = unit(line.direction);
  const values = rings
    .flatMap((ring) => ringCrossings(ring, line.origin, direction))
    .sort((a, b) => a - b);
  const intervals: Interval[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    if (values[index + 1] > values[index]) intervals.push([values[index], values[index + 1]]);
  }
  return intervals;
}

export function crossingsAtX(rings: readonly Ring[], x: number): Interval[] {
  return lineCrossings(rings, { origin: { x, z: 0 }, direction: CUT_DIRECTION });
}

export function isInside(rings: readonly Ring[], point: PlanPoint): boolean {
  return crossingsAtX(rings, point.x).some(([start, end]) => point.z > start && point.z < end);
}

function heightAt(height: Height, z: number): number {
  return typeof height === 'number' ? height : height(z);
}

function samplesOf([start, end]: Interval, slab: Slab): number[] {
  const varies = typeof slab.bottom !== 'number' || typeof slab.top !== 'number';
  const steps = varies ? Math.max(1, Math.ceil((end - start) / SAMPLE_STEP)) : 1;
  return Array.from({ length: steps + 1 }, (_, index) => start + ((end - start) * index) / steps);
}

export function capGeometry(x: number, slabs: readonly Slab[]): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  slabs.forEach((slab) =>
    slab.intervals.forEach((interval) => {
      const first = positions.length / XYZ;
      const samples = samplesOf(interval, slab);
      samples.forEach((z) => {
        positions.push(x, heightAt(slab.bottom, z), z, x, heightAt(slab.top, z), z);
      });
      for (let index = 0; index + 1 < samples.length; index += 1) {
        const bottom = first + index * 2;
        indices.push(bottom, bottom + 2, bottom + 3, bottom, bottom + 3, bottom + 1);
      }
    }),
  );
  const geometry = new BufferGeometry();
  const count = positions.length / XYZ;
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute(
    'normal',
    new Float32BufferAttribute(Array.from({ length: count }, () => FACING_CUT).flat(), XYZ),
  );
  geometry.setIndex(indices);
  return geometry;
}
