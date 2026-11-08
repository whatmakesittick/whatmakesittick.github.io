import { CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Point } from '../../../ids';

const UP = new Vector3(0, 1, 0);
const MIDDLE = 0.5;

export interface RodSpec {
  from: Point;
  to: Point;
  radius: number;
  topRadius?: number;
  segments: number;
}

export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  return mergeGeometries(
    parts.map((part) => {
      const flat = part.index ? part.toNonIndexed() : part;
      flat.deleteAttribute('uv');
      return flat;
    }),
  );
}

export function rod({ from, to, radius, topRadius = radius, segments }: RodSpec): BufferGeometry {
  const start = new Vector3(...from);
  const span = new Vector3(...to).sub(start);
  const geometry = new CylinderGeometry(topRadius, radius, span.length(), segments);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, span.clone().normalize()));
  return geometry.translate(...start.addScaledVector(span, MIDDLE).toArray());
}

export function clipBehind(points: readonly PlanPoint[], limit: number): PlanPoint[] {
  const kept: PlanPoint[] = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const inside = point.z <= limit;
    if (inside) kept.push(point);
    if (inside === next.z <= limit) return;
    const share = (limit - point.z) / (next.z - point.z);
    kept.push({ x: point.x + (next.x - point.x) * share, z: limit });
  });
  return kept;
}
