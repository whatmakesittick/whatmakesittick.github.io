import type { PlanPoint } from '@core/scene/geometry/extrude';
import type { Point } from '../../../ids';
import type { Interval, Ring } from '../../geometry/section';
import { lineCrossings } from '../../geometry/section';

const ACROSS_X: PlanPoint = { x: 1, z: 0 };

export function plan([x, , z]: Point): PlanPoint {
  return { x, z };
}

export function add(a: PlanPoint, b: PlanPoint, scale = 1): PlanPoint {
  return { x: a.x + b.x * scale, z: a.z + b.z * scale };
}

export function sub(a: PlanPoint, b: PlanPoint): PlanPoint {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function cross(a: PlanPoint, b: PlanPoint): number {
  return a.x * b.z - a.z * b.x;
}

export function dot(a: PlanPoint, b: PlanPoint): number {
  return a.x * b.x + a.z * b.z;
}

export function unit(a: PlanPoint): PlanPoint {
  const length = Math.hypot(a.x, a.z) || 1;
  return { x: a.x / length, z: a.z / length };
}

export function leftOf(direction: PlanPoint): PlanPoint {
  return { x: direction.z, z: -direction.x };
}

export function between(a: PlanPoint, b: PlanPoint, share: number): PlanPoint {
  return { x: a.x + (b.x - a.x) * share, z: a.z + (b.z - a.z) * share };
}

export function lineHit(p: PlanPoint, d: PlanPoint, q: PlanPoint, e: PlanPoint): PlanPoint {
  const along = cross(sub(q, p), e) / cross(d, e);
  return add(p, d, along);
}

export interface PolylineHit {
  readonly point: PlanPoint;
  readonly index: number;
}

export function polylineHit(
  points: readonly PlanPoint[],
  origin: PlanPoint,
  direction: PlanPoint,
): PolylineHit | null {
  for (let index = 0; index + 1 < points.length; index += 1) {
    const edge = sub(points[index + 1], points[index]);
    const facing = cross(direction, edge);
    if (facing === 0) continue;
    const share = cross(sub(points[index], origin), direction) / facing;
    if (share >= 0 && share <= 1) return { point: add(points[index], edge, share), index };
  }
  return null;
}

export function arcBelow(ring: Ring, zMax: number): PlanPoint[] {
  const start = ring.findIndex((point) => point.z > zMax);
  const arc: PlanPoint[] = [];
  for (let step = 0; step < ring.length; step += 1) {
    const from = ring[(start + step) % ring.length];
    const to = ring[(start + step + 1) % ring.length];
    const fromBelow = from.z <= zMax;
    const toBelow = to.z <= zMax;
    if (fromBelow !== toBelow) arc.push(between(from, to, (zMax - from.z) / (to.z - from.z)));
    if (fromBelow && toBelow) arc.push(to);
    else if (!fromBelow && toBelow && to.z < zMax) arc.push(to);
  }
  return arc;
}

export function spanAtZ(ring: Ring, z: number): Interval {
  const spans = lineCrossings([ring], { origin: { x: 0, z }, direction: ACROSS_X });
  return [spans[0][0], spans[spans.length - 1][1]];
}

function segmentDistance(point: PlanPoint, a: PlanPoint, b: PlanPoint): number {
  const edge = sub(b, a);
  const share = Math.min(1, Math.max(0, dot(sub(point, a), edge) / (dot(edge, edge) || 1)));
  const nearest = add(a, edge, share);
  return Math.hypot(point.x - nearest.x, point.z - nearest.z);
}

export function edgeDistance(point: PlanPoint, ring: Ring): number {
  return ring.reduce(
    (nearest, a, index) =>
      Math.min(nearest, segmentDistance(point, a, ring[(index + 1) % ring.length])),
    Infinity,
  );
}

export function quad(start: PlanPoint, end: PlanPoint, width: number): PlanPoint[] {
  const side = leftOf(unit(sub(end, start)));
  const half = width / 2;
  return [
    add(start, side, half),
    add(end, side, half),
    add(end, side, -half),
    add(start, side, -half),
  ];
}

export function circle(centre: PlanPoint, radius: number, sides: number): PlanPoint[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    return { x: centre.x + Math.cos(angle) * radius, z: centre.z + Math.sin(angle) * radius };
  });
}

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export function boundsRing({ minX, maxX, minZ, maxZ }: Bounds): PlanPoint[] {
  return [
    { x: minX, z: maxZ },
    { x: maxX, z: maxZ },
    { x: maxX, z: minZ },
    { x: minX, z: minZ },
  ];
}

export function boundsOf(ring: Ring): Bounds {
  const xs = ring.map((point) => point.x);
  const zs = ring.map((point) => point.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

export function lastOf<T>(items: readonly T[]): T {
  return items[items.length - 1];
}
