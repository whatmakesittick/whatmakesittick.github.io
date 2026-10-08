import { BufferAttribute, BufferGeometry } from 'three';
import type { Point } from '../../../ids';
import { terrainHeight } from '../../../model';
import type { GroundPoint } from '../../../model';

const SAMPLE_STEP_M = 20;
const MIN_MITER = 0.5;
const XYZ = 3;
const UV = 2;

export interface RibbonOptions {
  readonly width: number;
  readonly lift: number;
  readonly period: number;
}

export function onGround([x, z]: GroundPoint, lift = 0): Point {
  return [x, terrainHeight(x, z) + lift, z];
}

export interface GroundRange {
  readonly low: number;
  readonly high: number;
}

const RANGE_SAMPLES = 4;

export function groundRange([x, z]: GroundPoint, halfX: number, halfZ = halfX): GroundRange {
  const heights = Array.from({ length: (RANGE_SAMPLES + 1) ** 2 }, (_, index) => {
    const column = index % (RANGE_SAMPLES + 1);
    const row = Math.floor(index / (RANGE_SAMPLES + 1));
    const sampleX = x - halfX + (2 * halfX * column) / RANGE_SAMPLES;
    const sampleZ = z - halfZ + (2 * halfZ * row) / RANGE_SAMPLES;
    return terrainHeight(sampleX, sampleZ);
  });
  return { low: Math.min(...heights), high: Math.max(...heights) };
}

export function midpoint(from: GroundPoint, to: GroundPoint): GroundPoint {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
}

export function densify(route: readonly GroundPoint[], step = SAMPLE_STEP_M): GroundPoint[] {
  return route.flatMap(([x, z], index): GroundPoint[] => {
    if (index === 0) return [[x, z]];
    const [fromX, fromZ] = route[index - 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x - fromX, z - fromZ) / step));
    return Array.from({ length: steps }, (_, part) => {
      const share = (part + 1) / steps;
      return [fromX + (x - fromX) * share, fromZ + (z - fromZ) * share];
    });
  });
}

function segmentSide(from: GroundPoint, to: GroundPoint): GroundPoint {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
}

function miteredSide(points: readonly GroundPoint[], index: number): GroundPoint {
  const before = segmentSide(points[Math.max(0, index - 1)], points[Math.max(1, index)]);
  const last = points.length - 1;
  const after = segmentSide(points[Math.min(index, last - 1)], points[Math.min(index + 1, last)]);
  const sumX = before[0] + after[0];
  const sumZ = before[1] + after[1];
  const length = Math.hypot(sumX, sumZ) || 1;
  const sideX = sumX / length;
  const sideZ = sumZ / length;
  const miter = 1 / Math.max(sideX * after[0] + sideZ * after[1], MIN_MITER);
  return [sideX * miter, sideZ * miter];
}

export function ribbonGeometry(
  route: readonly GroundPoint[],
  { width, lift, period }: RibbonOptions,
): BufferGeometry {
  const points = densify(route);
  const positions = new Float32Array(points.length * 2 * XYZ);
  const laterals = new Float32Array(points.length * 2 * XYZ);
  const uvs = new Float32Array(points.length * 2 * UV);
  let distance = 0;
  points.forEach(([x, z], index) => {
    if (index > 0) distance += Math.hypot(x - points[index - 1][0], z - points[index - 1][1]);
    const [sideX, sideZ] = miteredSide(points, index);
    [1, -1].forEach((sign, edge) => {
      const vertex = index * 2 + edge;
      const edgeX = x + (sign * sideX * width) / 2;
      const edgeZ = z + (sign * sideZ * width) / 2;
      positions.set([edgeX, terrainHeight(edgeX, edgeZ) + lift, edgeZ], vertex * XYZ);
      laterals.set([sign * sideX, 0, sign * sideZ], vertex * XYZ);
      uvs.set([distance / period, edge], vertex * UV);
    });
  });
  const indices = points.slice(1).flatMap((_, index) => {
    const left = index * 2;
    return [left, left + 2, left + 1, left + 2, left + 3, left + 1];
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('lateral', new BufferAttribute(laterals, XYZ));
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
